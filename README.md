# [WIP] rate-limiter-redis

A high-performance, Redis-backed rate limiter supporting multiple algorithms — **Fixed Window**, **Sliding Window**, and **Token Bucket** — with support for usage as standalone logic or middleware in **Express** and **Hono**.

Built with [**ioredis**](https://www.npmjs.com/package/ioredis) for performance and production readiness.

---

## 🔧 Features

- 📦 **Redis-backed** (ioredis)
- 🧠 Supports **Fixed Window**, **Sliding Window**, and **Token Bucket**
- 🔁 Designed for **distributed environments**
- 🌐 Works as **Express** and **Hono** middleware
- 🪶 Lightweight and framework-agnostic core
- 🛠️ Fully typed with **TypeScript**

---

## 📦 Installation

```bash
npm install @ikrbasak/rate-limiter ioredis
```
