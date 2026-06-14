Expense Tracker App - Full Stack Development Prompt

You are a senior React Native, Fastify, PostgreSQL, and Drizzle ORM engineer.

Build a complete production-ready Expense Tracker application inspired by the attached screenshots.

Tech Stack
Frontend
React Native (Expo SDK latest)
TypeScript
Expo Router
React Query (TanStack Query)
Zustand for state management
React Hook Form
Zod validation
React Native Paper
Victory Native or Recharts for charts
Axios
MMKV Storage
Dark Theme by default
Backend
Node.js
TypeScript
Fastify
PostgreSQL (Supabase)
Drizzle ORM
JWT Authentication
bcrypt
Zod validation
Repository-Service-Controller architecture
Database

Use PostgreSQL via Supabase.

Use Drizzle ORM migrations only.

Never write manual SQL migrations.

Existing Project Structure

Backend already exists.

backend/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema/
│   │       ├── users.ts
│   │       ├── categories.ts
│   │       ├── transactions.ts
│   │       └── budgets.ts
│   └── index.ts
├── drizzle.config.ts
└── .env

Continue using this structure.

Features
Authentication

Implement:

Register

Fields:

Full Name
Email
Password
Login

Fields:

Email
Password
JWT Authentication

Store JWT securely.

Protected APIs.

Accounts

Support multiple accounts.

Examples:

Cash
Bank
Wallet
UPI
Credit Card

Fields:

id
userId
name
balance
icon
createdAt
updatedAt
Categories

Expense Categories

Examples:

Food
Shopping
Entertainment
Education
Health
Travel
Housing
Transport
Car
Electronics
Clothing
Gifts
Pets
Repairs
Sports
Donations

Income Categories

Examples:

Salary
Investments
Bonus
Return
Part Time
Other

User can create custom categories.

Transactions

Transaction Types:

Expense
Income
Transfer

Fields:

id
userId
accountId
categoryId
type
amount
title
note
transactionDate
createdAt
updatedAt

Transfer:

fromAccountId
toAccountId
amount
Budget Module

Monthly Budget

Fields:

id
userId
month
year
amount

Show:

Budget
Spent
Remaining

Like screenshots.

Home Screen

Create exact behavior from screenshots.

Display:

Header

Current Month

Example:

June 2026
Summary Cards

Show:

Expenses
Income
Balance

Balance:

Income - Expense
Transaction Feed

Grouped by date.

Example:

13 Jun
Income: ₹2000

11 Jun
Expenses: ₹4025

Each item displays:

Category Icon
Title
Amount
Income/Expense color
Time

Floating Add Button.

Bottom Navigation.

Add Transaction Screen

Replicate screenshots.

Tabs:

Expense
Income
Transfer

Category grid.

Icon selection.

Amount input.

Title input.

Note input.

Account selector.

Date selector.

Save button.

Charts Screen

Create analytics dashboard.

Filters
Weekly
Monthly
Yearly
Pie Chart

Expense breakdown.

Category Percentages

Example:

Food 35%
Shopping 20%
Travel 15%
Income Chart

Separate analytics.

Monthly Trend

Line chart.

Calendar Screen

Monthly calendar view.

Each day displays:

Income
Expense

Click day:

Show all transactions.

Reports Screen

Create:

Analytics Tab

Show:

Monthly Statistics
Expense Total
Income Total
Balance
Budget Status
Accounts Tab

Show:

Account Wise Balances
Transaction Count
Account Summary
Profile Screen

User Profile

Features:

Update Profile
Change Password
Export Data
Dark Theme
Logout
Dashboard APIs

Create APIs for:

Dashboard Summary
GET /dashboard/summary

Return:

{
  "income": 17000,
  "expense": 6095,
  "balance": 10905
}
Monthly Analytics
GET /analytics/monthly
Category Analytics
GET /analytics/categories
Calendar Analytics
GET /analytics/calendar
Database Schema

Create Drizzle schemas for:

users
accounts
categories
transactions
budgets
refreshTokens

Include:

createdAt
updatedAt

for every table.

Use UUID primary keys.

Backend Requirements

Generate:

Controllers
Services
Repositories
Routes
Middleware
Validators
DTOs
Error Handling
Logger
Environment Validation
JWT Auth
Pagination
Filtering
Search
Frontend Requirements

Generate:

Screens
Components
Hooks
API Layer
Zustand Stores
React Query Setup
Navigation
Theme System
Reusable Form Components
Loading States
Error States
Empty States
Deliverables

Generate complete code.

Create all folders.

Create all files.

Create backend APIs.

Create Drizzle schemas.

Create migrations.

Create frontend screens.

Create reusable components.

Create API integration.

Create TypeScript types.

Create README with setup instructions.

The application must be production-ready and fully functional with Expo + Fastify + Supabase PostgreSQL + Drizzle ORM.