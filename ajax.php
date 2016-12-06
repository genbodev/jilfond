<?php

/* не стал заморачиваться с классами (все примитивно просто) */

define('HOST', 'localhost');
define('USER', 'root');
define('PASSWORD', '');
define('DATABASE', 'jilfond');

/* условие выполнится при первой загрузке страницы и f5 */
if (isset($_POST['mode']) && $_POST['mode'] === 'getRss') {
  getRss();
}
/* в противном случае имеем дело с сохранением комментария */
else {
  saveComment();
}

/* получит новости из кеша или напрямую с rss ленты, если устарел кеш */
function getRss() {

  $hashes = array();
  $whereArr = array();
  $types = '';

  $memcache = new Memcache;
  $memcache->connect('localhost', 11211) or exit('Невозможно подключиться к серверу Memcached');

  $news = @$memcache->get('news');
  $title = @$memcache->get('title');

  if (!empty($news) && !empty($title)) {

    foreach ($news as $hash => $value) {
      $hashes[] = md5($hash);
      $whereArr[] = 'guid_hash = ?';
      $types .= 's';
    }

    $news = attachComments($news, $whereArr, $types, $hashes);
  }
  else {
    
    $rss = simplexml_load_file('https://lenta.ru/rss');

    $title = $rss->channel->title;
    $news = array();

    foreach ($rss->channel->item as $item) {
      $news[md5($item->guid)] = array(
        'link' => (string) $item->link,
        'title' => (string) $item->title,
        'desc' => (string) $item->description,
        'comments' => array()
      );
      $hashes[] = md5($item->guid);
      $whereArr[] = 'guid_hash = ?';
      $types .= 's';
    }

    $news = attachComments($news, $whereArr, $types, $hashes);

    $memcache->set('news', $news, false, 3600) or die ('Не получилось оставить запись в Memcached');
    $memcache->set('title', (string) $title, false, 0) or die ('Не получилось оставить запись в Memcached');
  }

  $memcache->close();

  echo json_encode(array('title' => (string) $title, 'news' => $news));
}

/* присоеденит к массиву с новостями комментарии из БД */
function attachComments($news, $whereArr, $types, $hashes) {
  $mysqli = mysqli_connect(HOST, USER, PASSWORD, DATABASE) or die('Ошибка ' . mysqli_error($mysqli));
  $sql = "SELECT guid_hash, email, comment, created_at FROM comments WHERE " . implode(' OR ', $whereArr);
  $stmt = $mysqli->prepare($sql);

  call_user_func_array(
    array(
      $stmt,
      'bind_param'
    ),
    makeValuesReferenced(array_merge(array($types), $hashes))
  );

  $stmt->execute();
  $stmt->store_result();
  $stmt->bind_result($hash, $email, $text, $date);

  if ($stmt->num_rows > 0) {
    while ($stmt->fetch()) {
      $news[$hash]['comments'][] = array('email' => $email, 'comment' => $text, 'date' => $date);
    }
  }

  $stmt->close();

  return $news;
}

/* подготовит индексированный массив для call_user_func_array с учетом версии php */
function makeValuesReferenced($arr) {

  if (strnatcmp(phpversion(), '5.3') >= 0) {
    $refs = array();
    foreach ($arr as $key => $value)
      $refs[$key] = &$arr[$key];
    return $refs;
  }

  return $arr;
}

/* сохранит комментарий в БД */
function saveComment() {

  $mysqli = mysqli_connect(HOST, USER, PASSWORD, DATABASE) or die('Ошибка ' . mysqli_error($mysqli));
  $sql = "INSERT INTO comments (guid_hash, email, comment) VALUES (?, ?, ?)";
  $stmt = $mysqli->prepare($sql);
  $stmt->bind_param('sss', $_POST['hash'], $_POST['email'], $_POST['text']);
  $stmt->execute();
  $insert_id = $mysqli->insert_id;
  $stmt->close();

  echo json_encode(array('id' => $insert_id, 'date' => date('Y-m-d H:i:s')));
}