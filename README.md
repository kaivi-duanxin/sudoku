# DT Sudoku Lab

一个科技风数独小游戏，前端保持纯静态页面，排行榜通过 Vercel API 接入 Supabase Postgres 做持久化。

## Features

- 两个固定关卡：`Level 1` 为教学关，`Level 2` 为高难关
- 第二关提供 5 次提示，提示会直接填入一个正确数字
- 右上角实时排行榜，默认自动轮询刷新
- 计时、进度、昵称和本地回退榜单都会保存在浏览器 `localStorage`
- 预留 Vercel API + Supabase Postgres 持久化能力

## Files

- `index.html`: 页面结构
- `styles.css`: 科技感视觉和响应式样式
- `app.js`: 游戏逻辑、关卡、提示、排行榜适配层
- `config.js`: 当前排行榜配置，默认请求 `/api/leaderboard`
- `api/leaderboard.js`: Vercel Serverless API，负责读写 Supabase Postgres
- `db/schema.sql`: 排行榜数据表结构
- `.env.example`: Supabase 连接环境变量模板
- `package.json`: API 所需依赖

## Remote Leaderboard

当前默认配置：

```js
window.SUDOKU_APP_CONFIG = {
  leaderboard: {
    mode: "remote",
    endpoint: "/api/leaderboard",
    apiKey: "",
    timeoutMs: 4000,
    pollIntervalMs: 12000
  }
};
```

前端会自动请求：

- `GET /api/leaderboard?levelId=level-1&limit=50`
- `POST /api/leaderboard`

`POST` 请求体格式：

```json
{
  "playerName": "Anonymous Pilot",
  "levelId": "level-2",
  "seconds": 173,
  "hintsUsed": 2,
  "completedAt": "2026-06-02T12:34:56.000Z"
}
```

响应格式：

```json
{
  "records": [
    {
      "id": "run-1",
      "playerName": "Anonymous Pilot",
      "levelId": "level-2",
      "seconds": 173,
      "hintsUsed": 2,
      "completedAt": "2026-06-02T12:34:56.000Z"
    }
  ]
}
```

如果远程接口不可用，前端会自动回退到本地排行榜。

页面默认展示前 8 名，但内部会使用更长的榜单来计算当前通关排名。

如果你直接用 `file:///.../index.html` 预览，前端会自动退回本地榜单，因为 `file://` 环境无法访问同源 `/api/leaderboard`。要验证 Supabase 持久化，请通过 Vercel 域名，或使用 `vercel dev` 这类支持 API 路由的本地环境访问。

## Supabase Env

我已经根据你提供的信息写好了环境变量模板：

```bash
SUPABASE_DB_HOST=db.zgpjvphzblbsisarykou.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=
SUPABASE_DB_SSL=true
```

现在还缺一个必须项：

- `SUPABASE_DB_PASSWORD`

只要你把数据库密码补给我，或者直接填进 Vercel 的环境变量，这个排行榜接口就能真正写入 Supabase。
