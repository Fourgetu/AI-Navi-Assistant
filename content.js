// content.js - 终极修复汇总版 (v1.2.1)

const CONFIG = {
    'gemini.google.com': {
        // 定位到包含整段文字的顶级容器，确保 YAML 代码块只对应一个导航点
        parentSelector: 'div.query-text, user-query-bubble, [role="article"]', 
        textSelector: '.query-text-line'
    },
    'chatgpt.com': {
        parentSelector: '[data-testid^="conversation-turn-"]',
        textSelector: '.whitespace-pre-wrap'
    }
};

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function updateSidebar() {
    const host = window.location.hostname;
    const cfg = CONFIG[host];
    if (!cfg) return;

    let sidebar = document.getElementById('gemini-quick-nav');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'gemini-quick-nav';
        document.body.appendChild(sidebar);
    }

    const allLines = document.querySelectorAll(cfg.textSelector);
    let validQueries = [];
    let seenParents = new Set(); // 核心排重：一个父容器只产生一个点

    allLines.forEach((el) => {
        // 向上寻找该行文字所属的独立提问块
        const parent = el.closest(cfg.parentSelector) || el.parentElement;
        
        if (!seenParents.has(parent)) {
            const text = el.innerText.trim();
            // 过滤无意义字符和系统标签
            if (text && text.length > 1 && text !== 'You') {
                validQueries.push({
                    element: el,
                    text: text.replace(/\s+/g, ' ')
                });
                seenParents.add(parent);
            }
        }
    });

    // 如果导航项数量没变，不执行重绘，防止闪烁
    if (sidebar.children.length === validQueries.length) return;

    sidebar.style.display = validQueries.length > 0 ? 'block' : 'none';
    sidebar.innerHTML = '';

    validQueries.forEach((item, index) => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'nav-text';
        // 限制标题显示字数，保持美观
        textSpan.innerText = item.text.length > 18 ? item.text.substring(0, 18) + '...' : item.text;
        
        navItem.appendChild(textSpan);
        navItem.title = item.text;

        // 修复跳转逻辑，特别是最后一个提问无法触达的问题
        navItem.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            navItem.classList.add('active');

            const isLast = index === validQueries.length - 1;
            item.element.scrollIntoView({ 
                behavior: 'smooth', 
                block: isLast ? 'end' : 'center' // 最后一个元素对齐底部，避免被输入框遮挡
            });

            // 针对 Gemini 动态加载的补偿跳转
            setTimeout(() => {
                const rect = item.element.getBoundingClientRect();
                if (rect.top < 0 || rect.top > window.innerHeight) {
                    item.element.scrollIntoView({ behavior: 'auto', block: 'center' });
                }
            }, 500);
        };

        sidebar.appendChild(navItem);
    });
}

// 监听 DOM 变化：处理大模型流式输出时的内容更新
const observer = new MutationObserver(debounce(updateSidebar, 500));
observer.observe(document.body, { childList: true, subtree: true });

// 初始化执行
setTimeout(updateSidebar, 1500);
// 兜底检查：确保在复杂的动态加载下依然能渲染
setInterval(updateSidebar, 4000);