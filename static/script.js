// Функция для отправки состояния чекбокса на сервер
function sendCheckboxState(checkbox) {
    const mdId = checkbox.getAttribute('data-md-id');
    const checkId = checkbox.id;
    const isChecked = checkbox.checked;

    // Создаем объект с данными для отправки
    const data = {
        md_id: mdId,
        check_id: checkId,
        state: isChecked
    };

    // Отправляем POST запрос на сервер
    fetch('/api/state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.ok) {
                showStatus('Состояние чекбокса успешно сохранено', 'success');
            } else {
                throw new Error('Ошибка при сохранении состояния');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showStatus('Ошибка при сохранении состояния', 'error');
            // Возвращаем чекбокс в предыдущее состояние при ошибке
            checkbox.checked = !isChecked;
        });
}

// Функция для получения и установки состояния чекбоксов при загрузке
function loadCheckboxStates() {
    // Группируем чекбоксы по md_id
    const checkboxesByMdId = {};
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"][data-md-id]');
    allCheckboxes.forEach(checkbox => {
        const mdId = checkbox.getAttribute('data-md-id');
        if (!checkboxesByMdId[mdId]) {
            checkboxesByMdId[mdId] = [];
        }
        checkboxesByMdId[mdId].push(checkbox);
    });

    // Для каждого уникального md_id делаем запрос
    Object.keys(checkboxesByMdId).forEach(mdId => {
        fetch(`/api/states?md_id=${encodeURIComponent(mdId)}`)
            .then(response => response.json())
            .then(data => {
                const checkedIds = data.checked || [];
                checkboxesByMdId[mdId].forEach(checkbox => {
                    checkbox.checked = checkedIds.includes(checkbox.id);
                });
            })
            .catch(error => {
                console.error(`Ошибка при загрузке состояний для md_id ${mdId}:`, error);
                // Опционально: показать сообщение пользователю
            });
    });
}


// Функция для показа статуса операции
function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';

    // Скрываем статус через 3 секунды
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// Добавляем обработчики событий для всех чекбоксов и загружаем состояния при DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            sendCheckboxState(this);
        });
    });

    // Загружаем сохраненные состояния
    loadCheckboxStates();
});

// Функция для генерации и скачивания Markdown
function downloadMarkdown() {
    // Создаем пустой массив для строк Markdown
    const markdownLines = [];
    // Добавляем заголовок документа
    markdownLines.push("# Уточняющие вопросы по ТЗ бэкенда доставки\n");

    // Проходим по каждому разделу (section)
    document.querySelectorAll('.section').forEach(section => {
        // Получаем заголовок раздела (h2)
        const sectionTitle = section.querySelector('h2').textContent;
        // Добавляем его в Markdown
        markdownLines.push(`\n## ${sectionTitle}\n`);

        // Проходим по каждому подразделу (h3) внутри раздела
        section.querySelectorAll('h3').forEach(subsection => {
            // Получаем текст подраздела
            const subsectionTitle = subsection.textContent;
            // Добавляем его в Markdown
            markdownLines.push(`### ${subsectionTitle}\n`);

            // Находим список (ul), следующий сразу за h3
            const list = subsection.nextElementSibling;
            if (list && list.tagName.toLowerCase() === 'ul') {
                // Проходим по каждому элементу списка (li)
                list.querySelectorAll('li').forEach(listItem => {
                    // Находим чекбокс внутри элемента списка
                    const checkbox = listItem.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        // Определяем, отмечен ли чекбокс
                        const isChecked = checkbox.checked;
                        // Получаем текст метки (label) для чекбокса
                        const label = listItem.querySelector('label');
                        const labelText = label ? label.textContent.trim() : '';

                        // Формируем строку Markdown для элемента списка
                        // Используем [x] для отмеченных и [ ] для неотмеченных
                        const status = isChecked ? 'x' : ' ';
                        markdownLines.push(`- [${status}] ${labelText}`);
                    }
                });
            }
            // Добавляем пустую строку после каждого подраздела
            markdownLines.push('');
        });
    });

    // Объединяем все строки в одну строку Markdown
    const markdownContent = markdownLines.join('\n');

    // Создаем Blob (двоичный объект) из строки Markdown
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });

    // Создаем временный URL для Blob
    const url = URL.createObjectURL(blob);

    // Создаем временный элемент <a> для скачивания
    const link = document.createElement('a');
    link.href = url;
    // Указываем имя файла для скачивания
    link.download = 'clarifying_questions_backend_delivery.md';

    // Симулируем клик по ссылке для запуска скачивания
    link.click();

    // Освобождаем созданный URL
    URL.revokeObjectURL(url);
}

// Добавляем обработчики событий для всех чекбоксов и загружаем состояния при DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Находим кнопку по её ID
    const downloadBtn = document.getElementById('downloadMarkdownBtn');
    if (downloadBtn) {
        // Добавляем обработчик события 'click' на кнопку
        downloadBtn.addEventListener('click', downloadMarkdown);
    }

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            sendCheckboxState(this);
        });
    });

    // Загружаем сохраненные состояния
    loadCheckboxStates();
});