

# TraderERP MVP — Master Implementation Prompt

**Project:** TraderERP
**Implementation Type:** Full MVP rebuild
**Repository Strategy:** Rebuild inside the existing TraderERP project folder
**Product Stage:** MVP / Validation
**Priority:** Reliable core business workflows over feature quantity

---

## 1. ROLE

You are a senior full-stack software engineer, product engineer and technical architect.

You are working inside the **existing TraderERP project repository**.

Your task is to **rebuild TraderERP from the ground up within this same project folder**, using the existing codebase only as a reference/infrastructure source where useful.

The existing application should be treated as the **legacy version**.

The new implementation must become the clean, authoritative TraderERP MVP.

Do not simply patch the existing application.

Do not preserve poor architecture just because it already exists.

Do not create a separate repository or unrelated project.

---

# 2. IMPORTANT PROJECT RULE

Before making destructive changes:

1. Inspect the entire existing project structure.
2. Identify the frontend framework.
3. Identify the backend/API architecture.
4. Identify the database technology.
5. Identify authentication.
6. Identify storage.
7. Identify environment variables.
8. Identify deployment configuration.
9. Identify existing integrations.
10. Identify reusable components and utilities.
11. Identify existing domain/business logic.
12. Identify anything that must be preserved.

Create a Git checkpoint/branch/tag before beginning the rebuild.

### Do not immediately delete the legacy application.

First understand it.

Then rebuild over it systematically.

---

# 3. REBUILD STRATEGY

Use this decision framework for existing code:

### KEEP

Keep existing code when it is:

* Well structured
* Secure
* Reusable
* Compatible with the new architecture
* Actually useful to the MVP

### REFACTOR

Refactor code that:

* Works but is poorly structured
* Can be safely improved
* Fits the new architecture

### REPLACE

Replace code that:

* Conflicts with the new MVP
* Creates unnecessary complexity
* Has poor data relationships
* Produces confusing UX
* Contains unreliable business logic
* Was designed around features outside the new scope

### REMOVE

Remove functionality that is:

* Out of MVP scope
* Duplicated
* Confusing
* Broken
* Unvalidated
* Adding unnecessary complexity

---

# 4. PRODUCT VISION

TraderERP is a simple cloud-based business management platform designed to help small and growing businesses manage their daily operations in one place.

The MVP focuses on:

* Sales
* Inventory
* Expenses
* Customers
* Credit/debt
* Basic business reports
* Dashboard visibility

The product should help businesses move from scattered notebooks, spreadsheets, POS records and disconnected tools toward a more organized digital workflow.

---

# 5. CORE VALUE PROPOSITION

> **Simple business management for businesses that have outgrown notebooks but don't need the complexity of traditional ERP systems.**

Supporting message:

> Manage your sales, inventory, expenses, customers and business records in one simple workspace — and get a clearer view of how your business is performing.

Do not turn this into an enterprise ERP.

---

# 6. PRODUCT PRINCIPLES

Follow these principles throughout implementation:

### Simple

Do not add complexity without a clear user benefit.

### Integrated

Modules must work together.

### Fast

Core business operations should require minimal steps.

### Reliable

Business records must remain consistent.

### Secure

Business data must be properly isolated.

### Practical

Build for real SME workflows, not impressive-looking demos.

### Mobile-friendly

The product must work well on mobile devices.

### Validatable

The MVP should make it easy to test with real early adopters.

---

# 7. MVP MODULES

Implement:

```text
Authentication
Business Setup
Dashboard
Sales
Inventory
Expenses
Customers
Credit
Reports
Staff
Settings
Receipts
```

Prioritize:

```text
Authentication
Business Setup
Dashboard
Products
Inventory
Sales
Expenses
Reports
```

Then:

```text
Customers
Credit
Receipts
Staff
Settings
```

---

# 8. EXPLICITLY OUT OF SCOPE

Do NOT implement these as part of the MVP:

* Payroll
* Full accounting
* General ledger
* Advanced taxation
* Multi-branch management
* Manufacturing
* Advanced procurement
* Complex supplier management
* Enterprise CRM
* AI business assistant
* Advanced AI analytics
* Complex automation
* Marketplace integrations
* Mobile native applications
* Enterprise workflow engine
* Advanced subscription billing

Do not invent additional modules because they appear useful.

---

# 9. AUTHENTICATION

Implement:

* Registration
* Login
* Logout
* Forgot password
* Reset password
* Current user/session
* Protected routes

After registration, the user should be guided through business setup.

---

# 10. BUSINESS SETUP

New users should be able to create their business.

Required information:

* Business name
* Business type
* Phone
* Email
* Address
* Currency
* Optional logo

Default currency:

```text
NGN
```

The system must associate the authenticated user with the business as:

```text
Owner
```

---

# 11. MULTI-TENANT ARCHITECTURE

This is mandatory.

Every business-owned record must be scoped to the authenticated business.

Examples:

```text
products.business_id
categories.business_id
customers.business_id
sales.business_id
payments.business_id
expenses.business_id
inventory_movements.business_id
receipts.business_id
audit_logs.business_id
```

Never rely on frontend filtering for tenant isolation.

Every backend query must verify the current business context.

A user belonging to Business A must never be able to retrieve or modify Business B's data.

---

# 12. USER ROLES

Implement:

```text
Owner
Admin
Staff
```

Use sensible default permissions.

### Owner

Full access.

### Admin

Business operational access.

### Staff

Limited operational access such as:

* View products
* Create sales
* View relevant customers
* Record permitted expenses

The permission system should remain simple.

Do not build a complex enterprise RBAC interface for the MVP.

---

# 13. DATABASE

Use the existing database technology if it is suitable and reliable.

If the current database architecture is unsuitable, migrate to a relational structure appropriate for the MVP.

Core tables:

```text
users
businesses
business_members

categories
products
inventory_movements

customers

sales
sale_items
payments

expense_categories
expenses

receipts

audit_logs
```

---

# 14. PRODUCTS

Implement:

* Product creation
* Product editing
* Product viewing
* Product search
* Product categorization
* SKU
* Purchase price
* Selling price
* Current stock
* Minimum stock
* Product image where supported
* Active/inactive status

Example:

```text
Product:
Sneakers

SKU:
SNK-001

Purchase Price:
₦12,000

Selling Price:
₦18,000

Stock:
24

Minimum Stock:
5
```

---

# 15. INVENTORY

Implement:

* Opening stock
* Stock additions
* Manual adjustments
* Stock movement history
* Low-stock detection
* Out-of-stock detection
* Automatic stock reduction after sales
* Automatic stock restoration when valid sales are cancelled

Do not allow negative stock in the MVP.

---

# 16. INVENTORY MOVEMENTS

Every stock change must create a movement.

Supported types:

```text
opening_stock
stock_addition
sale
sale_reversal
manual_adjustment
```

Manual adjustments require a reason.

Example:

```text
Adjustment:
+5

Reason:
New stock received
```

---

# 17. SALES

Implement a fast sales workflow.

Required flow:

```text
New Sale
↓
Search/select product
↓
Set quantity
↓
Add additional products
↓
Select customer or Walk-in Customer
↓
Apply discount if applicable
↓
Calculate total
↓
Select payment option
↓
Complete sale
↓
Update inventory
↓
Record payment
↓
Update customer credit
↓
Generate receipt
↓
Update dashboard/report data
```

---

# 18. SALE CALCULATION

Never trust frontend totals.

The backend must calculate and validate:

```text
item subtotal
sale subtotal
discount
sale total
amount paid
balance due
```

Example:

```text
2 × ₦5,000 = ₦10,000

Discount = ₦1,000

Total = ₦9,000
```

---

# 19. PAYMENT OPTIONS

Support:

```text
Cash
Bank Transfer
POS
Other
```

Payment status:

```text
Paid
Partial
Credit
```

---

# 20. CREDIT SALES

Example:

```text
Total = ₦20,000
Paid = ₦5,000
Balance = ₦15,000
```

Store the correct payment/balance state.

Allow later payment recording.

Example:

```text
Outstanding:
₦15,000

Payment:
₦10,000

Remaining:
₦5,000
```

When fully paid:

```text
Balance = ₦0
Status = Paid
```

---

# 21. WALK-IN CUSTOMERS

Do not force users to create a customer for every sale.

Support:

```text
Walk-in Customer
```

without requiring a customer record.

---

# 22. SALE CANCELLATION

Do not hard-delete completed sales.

When a valid sale is cancelled:

```text
Sale status → cancelled
Inventory → restored
Inventory movement → sale_reversal
Audit log → created
```

Historical information should remain available.

---

# 23. SALE ITEM SNAPSHOTS

Each sale item should preserve:

```text
product_name_snapshot
unit_price
quantity
discount
subtotal
```

This ensures old sales remain historically accurate even if the product later changes.

---

# 24. CUSTOMERS

Keep customer management lightweight.

Implement:

* Add customer
* Edit customer
* View customer
* Search customer
* Phone
* Email
* Address
* Notes
* Purchase history
* Outstanding balance

Do not turn this into a full CRM.

---

# 25. EXPENSES

Implement:

* Add expense
* Edit expense
* View expenses
* Expense categories
* Search/filter
* Date filtering
* Payment method
* Amount
* Description
* Notes

Example categories:

```text
Transport
Utilities
Rent
Packaging
Marketing
Staff
Other
```

---

# 26. DASHBOARD

Dashboard should answer:

### How much did I sell?

Today's sales.

### How much did I spend?

Today's/relevant expenses.

### What is my estimated performance?

Estimated profit.

### What needs attention?

Low stock and outstanding credit.

### What happened recently?

Recent business activity.

Primary dashboard cards:

```text
Today's Sales
Today's Expenses
Estimated Profit
Outstanding Credit
```

Supporting sections:

```text
Low Stock
Recent Sales
Recent Activity
```

---

# 27. ESTIMATED PROFIT

Clearly label the metric:

> Estimated Profit

Do not present TraderERP as a formal accounting system.

Basic concept:

```text
Sales
-
Estimated Cost of Goods
-
Expenses
=
Estimated Profit
```

Use the product purchase price as the initial cost basis where applicable.

---

# 28. REPORTS

Implement:

### Sales Report

* Total sales
* Number of transactions
* Paid sales
* Credit sales
* Date range

### Expense Report

* Total expenses
* Categories
* Date range

### Inventory Report

* Current stock
* Low stock
* Out-of-stock
* Stock movements

### Performance Report

* Sales
* Expenses
* Estimated profit
* Outstanding credit

Support:

```text
Today
Yesterday
This Week
This Month
Custom Range
```

---

# 29. RECEIPTS

After completing a sale, provide a receipt.

Receipt should include:

* Business name
* Business contact
* Receipt number
* Date
* Products
* Quantity
* Price
* Discount
* Total
* Amount paid
* Balance
* Customer where applicable

Actions:

```text
View Receipt
Print
Download/share where supported
New Sale
```

---

# 30. STAFF

Implement simple staff management:

* Add staff
* View staff
* Activate/deactivate staff
* Assign role
* View basic information

Roles:

```text
Owner
Admin
Staff
```

---

# 31. SETTINGS

Implement:

### Business Settings

* Business name
* Business type
* Contact information
* Address
* Logo
* Currency

### Account

* Name
* Email
* Password

### Staff

* Staff management

### Receipt

* Basic receipt information

### Security

* Password/session-related settings

---

# 32. UI/UX IMPLEMENTATION

The interface must follow the approved TraderERP UI/UX specification.

Design direction:

* Clean
* Professional
* Simple
* Modern
* Business-focused
* Mobile-first

Avoid:

* Excessive gradients
* Futuristic UI
* Neon effects
* Unnecessary glassmorphism
* Giant decorative illustrations
* Excessive animations
* Overloaded dashboards
* Generic admin-template appearance

---

# 33. TYPOGRAPHY

Use a highly readable modern sans-serif such as:

```text
Inter
```

Maintain consistent hierarchy.

Do not use multiple unrelated fonts.

---

# 34. COLOR SYSTEM

Use a restrained professional palette.

Primary:

```text
Deep Navy / Dark Blue
```

Supporting semantic colors:

```text
Green → success
Amber → warning
Red → destructive/error
Blue → information
```

Background:

```text
Light neutral
```

Surfaces:

```text
White
```

Do not make every component colorful.

---

# 35. DESKTOP NAVIGATION

Persistent sidebar:

```text
Dashboard

Sales
  New Sale
  Sales History

Inventory
  Products
  Stock

Expenses

Customers

Credit

Reports

Staff

Settings
```

Keep navigation simple.

---

# 36. MOBILE NAVIGATION

Use bottom navigation for primary actions:

```text
Home
Sales
+
Stock
More
```

The central `+` should provide:

```text
New Sale
Add Product
Add Expense
Add Customer
```

---

# 37. RESPONSIVENESS

The application must work properly across:

```text
Mobile
Tablet
Laptop
Desktop
```

On mobile:

* Forms become single-column
* Tables become cards or horizontally scrollable where appropriate
* Buttons remain touch-friendly
* Primary actions remain accessible
* Sales workflow is optimized for one-handed use

---

# 38. FRONTEND STRUCTURE

Use a clean modular structure similar to:

```text
src/
├── app/
├── components/
├── layouts/
├── pages/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── sales/
│   ├── inventory/
│   ├── expenses/
│   ├── customers/
│   ├── reports/
│   ├── staff/
│   └── settings/
├── services/
├── hooks/
├── utils/
├── types/
└── assets/
```

Adapt to the existing framework where appropriate.

Do not blindly force this exact structure if the current technology has a better established convention.

---

# 39. BACKEND STRUCTURE

Use clean separation between:

```text
Routes
Controllers
Services
Repositories/Data Access
Validators
Middleware
Models/Types
Utilities
Configuration
```

Business logic should not be scattered throughout UI components.

---

# 40. API

Use:

```text
/api/v1
```

Core resources:

```text
/auth
/business
/products
/categories
/inventory
/sales
/customers
/payments
/expenses
/reports
/staff
/receipts
```

Use consistent response and error structures.

---

# 41. CRITICAL BUSINESS TRANSACTION

Creating a sale must be atomic.

Conceptually:

```text
BEGIN

Authenticate
Validate business
Validate products
Validate stock
Calculate totals

Create sale
Create sale items
Reduce inventory
Create inventory movements
Create payment
Calculate balance
Create receipt reference
Create audit event

COMMIT
```

If any critical operation fails:

```text
ROLLBACK
```

Never leave a partially completed sale.

---

# 42. DATABASE SECURITY

Every business query must be scoped to the authenticated business.

Never allow:

```text
GET /products/:id
```

to return a product simply because the ID exists.

The backend must verify:

```text
product.business_id === authenticated_business_id
```

The same applies to:

* Sales
* Customers
* Expenses
* Payments
* Inventory
* Staff
* Receipts

---

# 43. VALIDATION

Validate at:

```text
Frontend
Backend
Database
```

Important validations:

* Required fields
* Positive quantities
* Valid monetary amounts
* Valid product ownership
* Valid customer ownership
* Sufficient stock
* Valid payment amount
* Valid business membership
* Valid role permissions

---

# 44. ERROR HANDLING

Never expose raw technical errors to users.

Bad:

```text
SQLSTATE[23505]
```

Better:

> A product with this SKU already exists.

Bad:

```text
500 Internal Server Error
```

Better:

> We couldn't complete the sale. Please try again.

Log technical information internally.

---

# 45. LOADING / EMPTY / ERROR STATES

Every major screen must support:

```text
Loading
Success
Empty
Error
```

Example:

> No products yet. Add your first product to start managing inventory.

Not:

> No data.

---

# 46. SEARCH & FILTERS

Implement useful search.

Products:

```text
Name
SKU
```

Customers:

```text
Name
Phone
```

Sales:

```text
Sale number
Customer
```

Expenses:

```text
Description
Category
Date
```

Use pagination for large datasets.

---

# 47. AUDIT LOGGING

Record important actions:

```text
CREATE_PRODUCT
UPDATE_PRODUCT
STOCK_ADJUSTMENT
CREATE_SALE
CANCEL_SALE
RECORD_PAYMENT
CREATE_EXPENSE
ADD_STAFF
UPDATE_SETTINGS
```

Do not build a complicated audit UI unless required.

---

# 48. PERFORMANCE

Optimize for practical SME usage.

Requirements:

* Fast initial load
* Efficient database queries
* Pagination
* Proper indexes
* Lazy loading where appropriate
* Optimized images
* Avoid unnecessary API calls
* Avoid fetching entire datasets for dashboard cards

The application should remain usable on average mobile connections.

---

# 49. SECURITY

Implement:

* Secure authentication
* Protected routes
* Authorization
* Tenant isolation
* Secure password handling
* Server-side validation
* Environment variables
* HTTPS in production
* Controlled file uploads
* Audit logging
* Database backups
* Secure session handling
* Rate limiting where appropriate

Never expose secrets in frontend code.

Never commit secrets to Git.

---

# 50. ENVIRONMENT CONFIGURATION

Before rebuilding, identify the current environment configuration.

Document:

```text
Database
Authentication
Storage
API
Deployment
Domain
Third-party services
```

Preserve valid infrastructure where possible.

Replace only when necessary.

---

# 51. DATA MIGRATION

Do not automatically migrate every legacy database record.

First determine whether existing data is:

* Valid
* Useful
* Compatible
* Required

The new MVP schema is the source of truth.

If legacy data cannot be safely mapped, start with clean MVP data.

---

# 52. DEVELOPMENT ENVIRONMENTS

Maintain:

```text
Development
Staging/Preview
Production
```

Do not develop directly against production data.

---

# 53. TESTING STRATEGY

Implement tests for critical business logic.

### Unit

Test:

* Sale calculations
* Discount calculations
* Inventory calculations
* Credit balance
* Permissions
* Profit calculations

### Integration

Test:

```text
Sale → Inventory
Sale → Payment
Credit Sale → Customer Balance
Expense → Reports
Stock Adjustment → Inventory History
Sale Cancellation → Stock Reversal
```

### E2E

Test the full business workflow.

---

# 54. REQUIRED END-TO-END TEST

The system must successfully complete:

```text
Register
↓
Create Business
↓
Dashboard
↓
Create Product
↓
Add 10 Stock
↓
Create Customer
↓
Create Sale of 3
↓
Pay ₦5,000
↓
Complete Sale
↓
Inventory becomes 7
↓
Outstanding balance is correct
↓
Receipt generated
↓
Dashboard updates
↓
Record remaining payment
↓
Outstanding becomes ₦0
↓
Reports update
```

---

# 55. FAILURE TESTS

Test:

### Insufficient stock

```text
Stock = 2
Attempt sale = 5
→ Reject
→ Stock remains 2
```

### Unauthorized access

```text
Business A user
→ Business B record
→ Reject
```

### Duplicate SKU

```text
Same business
→ duplicate SKU
→ Reject
```

### Invalid payment

```text
Outstanding = ₦5,000
Payment = ₦7,000
→ Reject
```

### Sale cancellation

```text
Sale = 3 units
Stock decreases by 3

Cancel
→ Stock increases by 3
→ Reversal movement created
→ Sale marked cancelled
```

---

# 56. IMPLEMENTATION ORDER

Do not randomly build pages.

Follow this sequence:

## Phase 0 — Existing Project Audit

Inspect:

* Repository
* Framework
* Database
* Auth
* Storage
* Deployment
* Environment
* Existing modules

Create Git checkpoint.

---

## Phase 1 — Foundation

Implement:

* New application structure
* Design system
* Authentication
* Business context
* Database foundation
* Tenant isolation
* Roles

---

## Phase 2 — Inventory

Implement:

* Categories
* Products
* Stock
* Inventory movements
* Low-stock logic

Test inventory independently.

---

## Phase 3 — Sales

Implement:

* Sales list
* New sale
* Sale calculations
* Sale items
* Payment
* Inventory deduction
* Customer association
* Credit
* Receipt
* Cancellation

This is the highest-priority business workflow.

---

## Phase 4 — Expenses

Implement:

* Categories
* Expense creation
* Expense history
* Filtering
* Dashboard integration

---

## Phase 5 — Customers & Credit

Implement:

* Customer management
* Purchase history
* Outstanding balances
* Payment recording

---

## Phase 6 — Dashboard

Connect:

* Sales
* Expenses
* Estimated profit
* Credit
* Low stock
* Recent activity

The dashboard should now consume real backend data.

---

## Phase 7 — Reports

Implement:

* Sales
* Expenses
* Inventory
* Performance

Use real database queries.

Do not create fake charts or placeholder metrics.

---

## Phase 8 — Staff & Settings

Implement:

* Staff
* Roles
* Business settings
* Account settings
* Receipt settings

---

## Phase 9 — UX Polish

Review:

* Mobile responsiveness
* Loading states
* Empty states
* Error states
* Form validation
* Accessibility
* Navigation
* Search
* Tables
* Modals
* Toasts

---

## Phase 10 — Testing

Run:

* Unit tests
* Integration tests
* E2E tests
* Security checks
* Tenant-isolation tests
* Mobile testing
* Production build

---

# 57. DEFINITION OF DONE

The MVP is **not complete** simply because all pages exist.

It is complete when a real business owner can:

```text
Create account
↓
Create business
↓
Add products
↓
Add stock
↓
Make sales
↓
Receive payments
↓
Record credit
↓
Record expenses
↓
Track customers
↓
See stock
↓
See outstanding credit
↓
Understand basic performance
↓
View reports
```

without encountering broken workflows or inconsistent data.

---

# 58. NO MOCK DATA IN PRODUCTION

Do not leave:

```text
Lorem ipsum
Demo sales
Fake customers
Fake dashboard numbers
Placeholder charts
Dummy business names
```

in the production application.

Development seed data may be used, but it must be clearly separated from production.

---

# 59. NO FAKE FUNCTIONALITY

Do not create buttons that only look functional.

For example:

```text
Export
Download
Record Payment
Complete Sale
Add Product
Cancel Sale
```

must actually work.

If a feature is not implemented, do not present it as completed.

---

# 60. NO UNNECESSARY FEATURES

When uncertain whether a feature belongs in the MVP:

Ask:

> Does this directly help a small business manage sales, inventory, expenses, customers, credit or basic performance?

If no:

**Do not build it now.**

---

# 61. CODE QUALITY

Write maintainable production-quality code.

Requirements:

* Clear naming
* Reusable components
* Modular architecture
* Small focused functions
* Proper error handling
* No unnecessary duplication
* No hardcoded secrets
* No giant components
* No unnecessary dependencies
* No abandoned experimental code

Avoid premature abstraction.

---

# 62. LEGACY CODE

Do not allow legacy code to dictate the new architecture.

If the old version contains:

* confusing pages
* duplicate workflows
* bad database relationships
* unused components
* obsolete APIs
* unnecessary features

replace/remove them.

The old version is a reference, not the product specification.

---

# 63. PRODUCT COPY

All user-facing copy should sound natural and human.

Avoid generic AI/SaaS phrases such as:

> Empower your business with cutting-edge solutions.

> Unlock unprecedented growth.

> Revolutionize your business operations.

Use direct language:

> Manage your sales, stock and expenses in one place.

> Add your first product.

> You have 5 products running low on stock.

> No sales yet.

> Record payment.

The interface should sound like a real business product built for real users.

---

# 64. ACCESSIBILITY

Implement sensible accessibility:

* Proper labels
* Keyboard navigation
* Visible focus states
* Sufficient contrast
* Accessible buttons
* Form error messages
* Semantic HTML
* Meaningful icons/labels

Do not rely on color alone to communicate status.

---

# 65. RESPONSIBLE FINANCIAL LANGUAGE

TraderERP is not a formal accounting system.

Use:

> Estimated Profit

instead of:

> Net Profit

where the calculation is not accounting-grade.

Use:

> Outstanding Credit

instead of unnecessarily complex accounting terminology.

The language should be understandable to SME owners.

---

# 66. FINAL PRODUCT STRUCTURE

The rebuilt application should ultimately feel like:

```text
                 TRADERERP
                     │
              BUSINESS WORKSPACE
                     │
       ┌─────────────┼─────────────┐
       │             │             │
    INVENTORY       SALES       EXPENSES
       │             │             │
    Products      Customers      Categories
    Stock         Payments       Expenses
       │             │
       └─────────────┼─────────────┘
                     │
                  CREDIT
                     │
                  REPORTS
                     │
                 DASHBOARD
```

Everything should connect.

---

# 67. FINAL IMPLEMENTATION COMMAND

**Now begin implementation.**

Do not create a new repository.

Do not create a separate TraderERP project.

Work inside the existing project folder.

First:

1. Audit the existing project.
2. Create a safe Git checkpoint.
3. Document the existing infrastructure.
4. Identify reusable infrastructure.
5. Establish the new MVP architecture.
6. Implement the database/schema.
7. Implement authentication and business context.
8. Implement inventory.
9. Implement sales and payments.
10. Implement customers and credit.
11. Implement expenses.
12. Implement dashboard.
13. Implement reports.
14. Implement staff/settings.
15. Implement receipts.
16. Connect all workflows.
17. Remove obsolete legacy functionality.
18. Test critical workflows.
19. Fix all functional and responsive issues.
20. Run production build checks.

Do not stop after creating the UI.

Do not use fake/mock data as a substitute for backend functionality.

Do not mark a feature complete until its frontend, backend, database interaction, validation and error handling are working.

---

# 68. FINAL ACCEPTANCE TEST

Before declaring the rebuild complete, demonstrate that this exact scenario works:

```text
USER REGISTRATION
        ↓
BUSINESS CREATION
        ↓
ADD PRODUCT
        ↓
ADD 10 UNITS STOCK
        ↓
CREATE CUSTOMER
        ↓
CREATE SALE
3 UNITS
        ↓
PARTIAL PAYMENT
        ↓
SALE COMPLETED
        ↓
STOCK = 7
        ↓
CUSTOMER BALANCE UPDATED
        ↓
RECEIPT GENERATED
        ↓
DASHBOARD UPDATED
        ↓
EXPENSE RECORDED
        ↓
ESTIMATED PERFORMANCE UPDATED
        ↓
CUSTOMER PAYS BALANCE
        ↓
OUTSTANDING = ₦0
        ↓
REPORTS UPDATED
```

Then test:

```text
INSUFFICIENT STOCK
UNAUTHORIZED ACCESS
DUPLICATE SKU
INVALID PAYMENT
SALE CANCELLATION
STOCK REVERSAL
MOBILE RESPONSIVENESS
```

Only after these pass should the rebuild be considered **TraderERP MVP-ready for real-world validation**.

---

## Build Sequence

We now have the complete implementation chain:

**PRD**
→ **TRD**
→ **UI/UX Specification**
→ **Database & Backend Architecture**
→ **Master Implementation Prompt**
→ **Code Rebuild**

The key decision throughout remains: **this is a clean rebuild of TraderERP inside the existing project, not a new project and not a patch of the old application.**
