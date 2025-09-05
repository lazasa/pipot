# pipot

**A lightweight, illustrative implementation inspired by React’s Fiber architecture.**

## Overview

**pipot** is a minimal implementation crafted to deepen my understanding of React's reconciliation process and Fiber architecture. It’s a simple but expressive project. Intentionally distilled to just **three files** that reimagines core aspects of React’s work scheduling in a clear way.

This project is not intended for production use. Instead, it serves as a compilation of learnings from various blog posts and insights drawn directly from the React source code.

## What You'll Find Inside

- **`index.html`** – A basic HTML shell to load and run the project in the browser.
- **`script.js`** – The heart of the project, showcasing:
  - A simplified version of a **unit of work scheduler**, inspired by React Fiber.
  - A manually-implemented **DFS-like traversal** logic using linked nodes (akin to `child`, `sibling`, and `return` pointers).
  - A rudimentary mechanism to **reconcile** and **commit** DOM changes.
- **`.prettierrc`** – Formatting configuration to keep the code clean and consistent.

## What I Learned

Working through **pipot** helped solidify several key concepts:

1. **Depth first traversal without recursion**  
   By implementing an explicit linked structure that mimics fibers, I learned how React manages traversal with iterative control instead of relying on the call stack.

2. **Separation of render and commit phases**  
   Just like React, I divided work into distinct phases:
   - A "render" phase, where a **work in progress tree** is assembled
   - A "commit" phase, where actual DOM mutations are applied

3. **Double buffering via current and WIP states**  
   Designing for two separate states (current vs. next) helped model how React prepares updates in memory while keeping the UI stable.

4. **Value of minimal examples**  
   Stripping down to the essentials made the intricate mechanics of Fiber much clearer. Understanding a tiny scheduler made the complexity in React’s full implementation more approachable.

## Why it’s Designed This Way

React’s Fiber architecture is undeniably powerful and complex. It enables **interruptible rendering**, **prioritization**, and **time slicing**, but understanding those concepts is easier if you start with a stripped down model.

**pipot** aims to distill that machinery into its simplest form. It’s a learning tool, a stepping stone toward grasping the real React source code. All inspiration for this project draws from blog articles and the open source React codebase itself, not from proprietary logic.

## Disclaimer

This is purely an educational project. It is not production ready and should not be used as a replacement for React or any other framework.