<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 项目规则：所有页面必须中英双语

- 每个页面 / 组件里用户能看到的文字（标题、按钮、标签、placeholder、提示、报错、空状态、toast）都要用 `const { lang, t } = useLang()`（`@/context/LanguageContext`）写成 `t('中文', 'English')`。
- 写在组件外面的常量数组 / 映射（导航项、状态、星期、月份等）要带 `en` 字段或单独的 EN 映射，渲染时按 `lang` 取。
- 不能接 `t` 的纯函数（日期格式化等）就把 `lang` 当参数传进去。
- 语言切换必须全站同时生效：不要把文案缓存进 state，也不要只翻一半页面。
- 学员端中文模式下的界面不能因此改变。
- 新做或改过的页面，提交前切到 English 走一遍，确认没有漏掉的中文。
