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
    const markdownLines = [];

    // Добавляем заголовок документа
    markdownLines.push("# Уточненный список API эндпоинтов для учебного бэкенда\n");

    // Обрабатываем только секции с контентом
    const sections = document.querySelectorAll('.section');

    sections.forEach(section => {
        // Обрабатываем заголовок секции
        const sectionTitle = section.querySelector('h2');
        if (sectionTitle) {
            markdownLines.push(`## ${sectionTitle.textContent}\n`);
        }

        // Обрабатываем все дочерние элементы секции
        Array.from(section.children).forEach(child => {
            processElement(child, markdownLines);
        });

        markdownLines.push(''); // Добавляем пустую строку между секциями
    });

    // Объединяем все строки в одну строку Markdown
    const markdownContent = markdownLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // Создаем Blob и скачиваем файл
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'api_endpoints_documentation.md';
    link.click();
    URL.revokeObjectURL(url);
}

// Вспомогательная функция для обработки элементов
function processElement(element, markdownLines) {
    const tag = element.tagName.toLowerCase();

    switch(tag) {
        case 'h1':
            markdownLines.push(`# ${element.textContent}\n`);
            break;

        case 'h2':
            // Уже обработали выше
            break;

        case 'h3':
            markdownLines.push(`### ${element.textContent}\n`);
            break;

        case 'ul':
            element.querySelectorAll('li').forEach(listItem => {
                const checkbox = listItem.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    const isChecked = checkbox.checked;
                    const label = listItem.querySelector('label');
                    const labelText = label ? label.textContent.trim() : listItem.textContent.trim();
                    const status = isChecked ? 'x' : ' ';
                    markdownLines.push(`- [${status}] ${labelText}`);
                } else {
                    // Обычный пункт списка без чекбокса
                    const text = listItem.textContent.trim();
                    if (text) {
                        markdownLines.push(`- ${text}`);
                    }
                }
            });
            markdownLines.push('');
            break;

        case 'pre':
            const code = element.querySelector('code');
            if (code) {
                markdownLines.push('```');
                markdownLines.push(code.textContent);
                markdownLines.push('```\n');
            }
            break;

        case 'p':
            const text = element.textContent.trim();
            if (text) {
                markdownLines.push(`${text}\n`);
            }
            break;

        case 'div':
            // Пропускаем кнопки и обрабатываем только контентные div
            if (!element.classList.contains('button-container') &&
                !element.classList.contains('section')) {
                Array.from(element.children).forEach(child => {
                    processElement(child, markdownLines);
                });
            }
            break;

        default:
            // Для других элементов просто добавляем текстовое содержимое
            if (element.textContent && element.textContent.trim() &&
                !['script', 'style', 'meta', 'link', 'title'].includes(tag)) {
                const text = element.textContent.trim();
                if (text && !markdownLines[markdownLines.length - 1]?.includes(text)) {
                    markdownLines.push(`${text}\n`);
                }
            }
            break;
    }
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