(function () {

    var data = {};

    /* ajax для получения ленты rss + комментарии */
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
    }
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            showNews(this);
        }
    };
    xmlhttp.open('POST', 'ajax.php', true);
    xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xmlhttp.send('mode=getRss');

    /* покажет новости + комментарии */
    function showNews(obj) {
        data = JSON.parse(obj.responseText);
        var wrapper = document.getElementById('wrapper');
        wrapper.textContent = '';
        var h2 = document.createElement('h2');
        h2.textContent = data.title;
        wrapper.appendChild(h2);
        var hash, title, link, desc, comments, h3, p, block, div;
        for (hash in data['news']) {
            if (data['news'].hasOwnProperty(hash)) {
                title = data['news'][hash]['title'];
                link = data['news'][hash]['link'];
                desc = data['news'][hash]['desc'];
                comments = data['news'][hash]['comments'];
                block = document.createElement('div');
                block.setAttribute('id', 'blc-' + hash);
                h3 = document.createElement('h3');
                h3.innerHTML = '<a href="' + link + '">' + title + '</a>';
                block.appendChild(h3);
                p = document.createElement('p');
                p.textContent = desc;
                block.appendChild(p);
                div = document.createElement('div');
                div.setAttribute('data-uid', hash);
                div.textContent = 'Добавить комментарий';
                div.style.textDecoration = 'underline';
                div.style.cursor = 'pointer';
                div.style.width = '172px';
                div.style.color = 'green';
                div.style.fontWeight = 'bold';
                div.onclick = function (e) {
                    showForm(e);
                };
                block.appendChild(div);
                block.appendChild(createComments(comments));
                wrapper.appendChild(block);
            }
        }
    }

    /* присоеденит комментарии к новости */
    function createComments(comments) {
        var commentsDiv = document.createElement('div');
        if (comments.length > 0) {
            debugger;
            var i;
            var nextComment;
            for (i = comments.length; i--;) {
                if (comments[i]) {
                    nextComment = document.createElement('div');
                    nextComment.innerHTML = formatText(comments[i]['email'], comments[i]['date'], comments[i]['comment']);
                    commentsDiv.appendChild(nextComment);
                }
            }
        }
        return commentsDiv;
    }

    /* покажет форму для заполнения коментария (скрытие формы делать не стал) */
    function showForm(e) {
        var target;
        e = e || event;
        target = e.target || e.srcElement;
        var uid = target.getAttribute('data-uid');
        var email, text, btn;
        var parent = target.parentNode;
        var form = document.createElement('form');
        form.setAttribute('data-uid', uid);
        email = 'E-mail<br /><input type="text" maxlength="50" name="email" required /><br />';
        text = 'Комментарий<br /><textarea name="text" required /></textarea><br />';
        btn = document.createElement('button');
        btn.textContent = 'Отправить';
        btn.onclick = function (e) {
            e.preventDefault();
            sendComment(e);
        };
        form.innerHTML = email + text;
        form.appendChild(btn);
        parent.replaceChild(form, target);
    }

    /* отправит комментарий посредством ajax на сервер */
    function sendComment(e) {
        var target;
        e = e || event;
        target = e.target || e.srcElement;
        var form = target.parentNode;
        var uid = form.getAttribute('data-uid');
        if (form[0].value === '' || form[1].value === '') {
            alert('Заполните поля с e-mail и комментарием!');
        }
        else {
            var formData = new FormData(form);
            formData.append('hash', uid);
            if (window.XMLHttpRequest) {
                xmlhttp = new XMLHttpRequest();
            } else {
                xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
            }
            xmlhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var answer = JSON.parse(this.responseText);
                    showComment(answer.id, uid, {email: form[0].value, text: form[1].value}, answer.date);
                }
            };
            xmlhttp.open('POST', 'ajax.php', true);
            xmlhttp.send(formData);
        }
    }

    /* покажет комментарий после успешной отправки на сервер */
    function showComment(id, uid, data, date) {

        if (id === 0) {
            alert('Ошибка записи в БД');
        } else {
            var block = document.getElementById('blc-' + uid);
            var comments = block.lastChild;
            var newComment = document.createElement('div');
            newComment.innerHTML = formatText(data['email'], date, data['text']);
            comments.insertBefore(newComment, comments.firstChild);
        }
    }

    /* простое форматирование комментариев (чтобы отличить визуально) */
    function formatText(email, date, text) {
        var html = '';
        html += '<p style="font-weight: bold;">(' + date + ') от ' + email + '</p>';
        html += '<span style="font-style: italic;">' + text + '</span><br />';
        return html;
    }
})();
