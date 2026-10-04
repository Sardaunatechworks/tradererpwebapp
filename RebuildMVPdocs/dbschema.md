TraderERP MVP
Database Schema & Backend Architecture Specification
Version: 1.0
Status: Build Specification
Product Stage: MVP / Validation
Architecture Strategy: Clean rebuild inside the existing TraderERP project
Database Principle: Relational, secure, multi-tenant, transaction-safe
________________________________________
1. Architecture Overview
The new TraderERP should follow a clean separation between the frontend, backend and database.
┌───────────────────────────────┐
│        TraderERP Web App      │
│       React / Frontend        │
└───────────────┬───────────────┘
                │
                │ HTTPS / API
                ▼
┌───────────────────────────────┐
│        Backend / API           │
│                               │
│ Authentication               │
│ Authorization                │
│ Business Logic               │
│ Validation                   │
│ Transactions                 │
│ Reporting                    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       Relational Database      │
│                               │
│ Users                         │
│ Businesses                    │
│ Products                      │
│ Sales                         │
│ Inventory                     │
│ Customers                     │
│ Payments                      │
│ Expenses                      │
│ Reports/Data                 │
└───────────────────────────────┘
Optional supporting services:
Storage
  └── Business logos
  └── Product images
  └── Generated receipts

Authentication
  └── Sessions
  └── Password reset

Monitoring
  └── Application logs
  └── Errors
  └── Audit events
________________________________________
2. Database Principles
The database must be designed around five principles:
1. Multi-tenancy
Every business must have isolated operational data.
2. Data integrity
Sales, inventory and payments must remain consistent.
3. Historical accuracy
Past sales should not change simply because a product's current price or name changes.
4. Auditability
Important business changes should be traceable.
5. Simplicity
The MVP should not introduce unnecessary enterprise-level tables.
________________________________________
3. Core Entity Relationship
The main relationship is:
User
 │
 └── Business Membership
          │
          ▼
       Business
          │
    ┌─────┼─────────┬──────────┐
    ▼     ▼         ▼          ▼
Products Customers Sales     Expenses
   │         │       │
   │         │       ├── Sale Items
   │         │       ├── Payments
   │         │       └── Receipt
   │         │
   └─────────┘
       │
       ▼
Inventory Movements
________________________________________
4. Core Tables
The MVP database should initially contain:
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
Roles and permissions can either be implemented using a small predefined role system or expanded later if the MVP requires more granular permissions.
________________________________________
5. users
Stores platform-level user accounts.
Fields
Field	Type	Notes
id	UUID	Primary key
name	VARCHAR	User's name
email	VARCHAR	Unique
phone	VARCHAR	Optional
password_hash	TEXT	If using application-managed auth
avatar_url	TEXT	Optional
status	VARCHAR	active/inactive
created_at	TIMESTAMP	Required
updated_at	TIMESTAMP	Required
If an external authentication provider is used, the password should not be stored locally.
Instead:
auth_provider_id
can identify the external authentication account.
________________________________________
6. businesses
Represents each SME/business using TraderERP.
Fields
Field	Type	Notes
id	UUID	Primary key
name	VARCHAR	Business name
business_type	VARCHAR	Retail, fashion, etc.
owner_id	UUID	FK → users
phone	VARCHAR	Optional
email	VARCHAR	Optional
address	TEXT	Optional
currency	VARCHAR	Default NGN
logo_url	TEXT	Optional
status	VARCHAR	active/inactive
created_at	TIMESTAMP	Required
updated_at	TIMESTAMP	Required
Rule
A business cannot access another business's records.
________________________________________
7. business_members
Connects users to businesses.
Business
   │
   ├── Owner
   ├── Admin
   └── Staff
Fields
Field	Type
id	UUID
business_id	UUID
user_id	UUID
role	VARCHAR
status	VARCHAR
created_at	TIMESTAMP
updated_at	TIMESTAMP
Role values
owner
admin
staff
A unique constraint should prevent the same user from being added to the same business twice.
________________________________________
8. categories
Product categories.
Fields
id
business_id
name
description
status
created_at
updated_at
Example:
Shoes
Perfumes
T-Shirts
Bags
Accessories
Category names should normally be unique within a business.
________________________________________
9. products
This is one of the most important tables.
Fields
id
business_id
category_id
name
sku
description
unit
purchase_price
selling_price
current_stock
minimum_stock
image_url
status
created_at
updated_at
Example
Product:
Sneakers

SKU:
SNK-001

Purchase Price:
₦12,000

Selling Price:
₦18,000

Current Stock:
24

Minimum Stock:
5
________________________________________
10. Product Rules
SKU
SKU should be unique within the business, not globally.
UNIQUE(business_id, sku)
Stock
Stock cannot normally fall below zero.
current_stock >= 0
Prices
Prices must be valid non-negative monetary values.
________________________________________
11. inventory_movements
This table provides the history behind stock changes.
Fields
id
business_id
product_id
type
quantity
reference_type
reference_id
reason
created_by
created_at
Movement types
opening_stock
stock_addition
sale
sale_reversal
manual_adjustment
Example:
Product: Sneakers

+20  opening_stock
+10  stock_addition
-3   sale
-2   sale
+1   manual_adjustment
Current stock can therefore be understood through its movement history.
________________________________________
12. Inventory Movement Rules
Whenever stock changes, the application should create a corresponding movement.
For example:
Add stock
current_stock = 20

Add 10

current_stock = 30

movement:
stock_addition +10
Sale
current_stock = 30

Sell 3

current_stock = 27

movement:
sale -3
Adjustment
current_stock = 27

Adjustment +2

current_stock = 29

movement:
manual_adjustment +2
reason = "Physical stock count"
This prevents silent stock changes.
________________________________________
13. customers
Customer records should remain lightweight.
Fields
id
business_id
name
phone
email
address
notes
status
created_at
updated_at
Customer information should be optional where appropriate because not every sale requires a registered customer.
________________________________________
14. Walk-in Customers
The MVP should support sales without requiring a customer account.
For example:
customer_id = NULL
The interface can display:
Walk-in Customer
This is important because forcing users to create customers for every small transaction would slow down sales.
________________________________________
15. sales
Represents the sale transaction.
Fields
id
business_id
customer_id
sale_number
subtotal
discount
total
amount_paid
balance_due
payment_status
payment_method
status
sold_by
created_at
updated_at
Status
completed
cancelled
Payment status
paid
partial
credit
________________________________________
16. Sale Number
Each sale should receive a readable business-level number.
Example:
TR-000001
TR-000002
TR-000003
or a business-specific format.
The exact format can be configurable later.
Database uniqueness:
UNIQUE(business_id, sale_number)
________________________________________
17. sale_items
Each sale can contain multiple products.
Fields
id
sale_id
product_id
product_name_snapshot
quantity
unit_price
discount
subtotal
created_at
The snapshot fields are important.
Suppose:
Today:
Sneakers = ₦18,000
A sale is recorded.
Three months later:
Sneakers = ₦22,000
The old sale must still show:
Sneakers
₦18,000
Therefore, the sale item stores the historical product name and selling price used at the time of the sale.
________________________________________
18. Sale Calculation
The backend must calculate totals.
Example:
Product A
Quantity: 2
Unit Price: ₦5,000

Subtotal = ₦10,000

Discount = ₦1,000

Total = ₦9,000
Do not rely only on frontend calculations.
The backend should recalculate and validate the values.
________________________________________
19. payments
Payments should be separate from sales because a customer can pay partially or later.
Fields
id
business_id
sale_id
customer_id
amount
payment_method
reference
recorded_by
created_at
Payment methods can initially include:
cash
bank_transfer
pos
other
________________________________________
20. Credit Sales
Example:
Sale Total = ₦20,000
Amount Paid = ₦5,000

Balance Due = ₦15,000
Database:
sales.total = 20000
sales.amount_paid = 5000
sales.balance_due = 15000
sales.payment_status = partial
When another payment of ₦10,000 is recorded:
Amount Paid = ₦15,000
Balance = ₦5,000
When the final ₦5,000 is paid:
Amount Paid = ₦20,000
Balance = ₦0
Status = paid
________________________________________
21. Credit Design Decision
For the MVP, do not create an unnecessarily complicated standalone debt/accounting system.
Credit can be derived primarily from:
sales
+
payments
+
customer
This keeps the architecture simpler.
Outstanding credit:
SUM(sale.balance_due)
for applicable customer sales.
________________________________________
22. expense_categories
Example categories:
Transport
Utilities
Rent
Packaging
Marketing
Staff
Other
Fields
id
business_id
name
description
status
created_at
updated_at
________________________________________
23. expenses
Fields
id
business_id
category_id
description
amount
payment_method
expense_date
note
recorded_by
created_at
updated_at
Example:
Transport
₦5,000
Cash
04 Oct 2026
________________________________________
24. receipts
Receipts should reference completed sales.
Fields
id
business_id
sale_id
receipt_number
generated_at
file_url
The receipt should not become the source of truth for financial data.
The source of truth remains:
sale
sale_items
payments
The receipt is a presentation/output layer.
________________________________________
25. audit_logs
Important business actions should be recorded.
Fields
id
business_id
user_id
action
entity_type
entity_id
metadata
created_at
Examples:
CREATE_PRODUCT
UPDATE_PRODUCT
STOCK_ADJUSTMENT
CREATE_SALE
CANCEL_SALE
RECORD_PAYMENT
CREATE_EXPENSE
ADD_STAFF
The MVP does not need an elaborate audit dashboard, but the backend should establish the foundation.
________________________________________
26. Database Relationships
The main relationships:
users
  │
  └── business_members
          │
          └── businesses
                │
                ├── categories
                │       └── products
                │              └── inventory_movements
                │
                ├── customers
                │       └── sales
                │
                ├── sales
                │    └── sale_items
                │           └── products
                │
                ├── payments
                │
                ├── expenses
                │       └── expense_categories
                │
                ├── receipts
                │
                └── audit_logs
________________________________________
27. Multi-Tenant Data Isolation
This is a critical security requirement.
Every business-owned table should contain:
business_id
Examples:
products.business_id
customers.business_id
sales.business_id
expenses.business_id
payments.business_id
inventory_movements.business_id
Backend queries must always scope records to the authenticated business.
Correct:
SELECT *
FROM products
WHERE business_id = authenticated_business_id;
Not:
SELECT *
FROM products;
Frontend filtering is not sufficient.
________________________________________
28. Authorization Flow
Every protected request should follow:
Request
   ↓
Authenticate User
   ↓
Identify Business Membership
   ↓
Check Role/Permission
   ↓
Validate Request
   ↓
Apply business_id scope
   ↓
Execute Operation
   ↓
Return Response
This prevents users from accessing another business's data.
________________________________________
29. Critical Sale Transaction
Creating a sale is the most important database transaction.
The operation should conceptually be:
BEGIN TRANSACTION

1. Validate authenticated user
2. Validate business membership
3. Validate products
4. Validate stock
5. Calculate sale totals
6. Create sale
7. Create sale items
8. Reduce product stock
9. Create inventory movements
10. Create payment record
11. Calculate outstanding balance
12. Create receipt reference
13. Create audit log

COMMIT
If something fails:
ROLLBACK
Nothing should be partially saved.
________________________________________
30. Why Transactions Matter
Imagine:
Sale created
↓
Stock reduced
↓
Payment creation fails
Without a transaction, the database could end up with:
Sale exists
Stock reduced
Payment missing
That would create inconsistent business records.
With a transaction:
Failure
↓
ROLLBACK
↓
Database returns to previous state
________________________________________
31. Sale Cancellation
A completed sale should not simply be deleted.
Instead:
Sale status = cancelled
Then:
Inventory movement:
sale_reversal
and the stock should be restored.
Example:
Before sale:
Stock = 20

Sale:
-3

Stock = 17

Cancel sale:
+3

Stock = 20
The historical record remains available.
________________________________________
32. Inventory Integrity
The backend must prevent:
Stock = 2
Sale quantity = 5
unless an explicitly supported future business rule allows negative inventory.
For MVP:
Do not allow negative inventory.
Return a clear error:
Not enough stock available for this product.
________________________________________
33. Payment Integrity
The backend should prevent:
payment > outstanding balance
unless the product intentionally supports overpayments.
For MVP:
Do not allow a payment greater than the outstanding amount.
________________________________________
34. Expense Integrity
Expenses must have:
amount > 0
and:
business_id
recorded_by
expense_date
must be valid.
________________________________________
35. Recommended Database Constraints
Important constraints include:
NOT NULL
FOREIGN KEY
UNIQUE
CHECK
Examples:
UNIQUE(business_id, sku)

UNIQUE(business_id, sale_number)

CHECK(quantity > 0)

CHECK(amount >= 0)

CHECK(current_stock >= 0)
Exact syntax depends on the selected database.
________________________________________
36. Indexing Strategy
Indexes should prioritize common business queries.
Recommended:
business_id

business_id + created_at

business_id + status

business_id + sku

business_id + phone

business_id + sale_number

customer_id

product_id

sale_id

expense_date
Do not create indexes blindly on every column.
________________________________________
37. Dashboard Data Architecture
The dashboard should not load every database record.
Instead, backend endpoints should provide summarized data.
Example:
GET /api/v1/dashboard/summary
Response concept:
{
  "todaySales": 125000,
  "todayExpenses": 35000,
  "estimatedProfit": 90000,
  "outstandingCredit": 28000,
  "lowStockCount": 4
}
Then:
GET /api/v1/dashboard/recent-sales
GET /api/v1/dashboard/low-stock
GET /api/v1/dashboard/recent-activity
________________________________________
38. Estimated Profit
For MVP, clearly label this as:
Estimated Profit
A basic calculation can be:
Sales
-
Cost of Goods Sold
-
Expenses
=
Estimated Profit
The system should not present this as formal accounting profit.
This distinction is important because TraderERP MVP is not an accounting platform.
________________________________________
39. Cost of Goods Sold
For the initial MVP, the product's purchase price can provide the basic cost basis.
Example:
Purchase price = ₦12,000
Selling price = ₦18,000
Quantity sold = 2
Revenue:
₦36,000
Estimated product cost:
₦24,000
Estimated gross margin:
₦12,000
Then expenses can be considered for the broader estimated performance view.
The implementation should clearly document the chosen calculation method rather than implying full accounting accuracy.
________________________________________
40. API Architecture
Base URL:
/api/v1
Structure:
/api/v1/auth
/api/v1/business
/api/v1/products
/api/v1/categories
/api/v1/inventory
/api/v1/sales
/api/v1/customers
/api/v1/payments
/api/v1/expenses
/api/v1/reports
/api/v1/staff
/api/v1/receipts
________________________________________
41. Authentication Endpoints
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
If using a managed authentication service, some of these operations may be delegated to the provider.
________________________________________
42. Product Endpoints
GET    /products
POST   /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id
For MVP, prefer soft deletion/inactivation where historical sales reference the product.
________________________________________
43. Inventory Endpoints
GET  /inventory
GET  /inventory/movements
POST /inventory/:productId/adjust
GET  /inventory/low-stock
________________________________________
44. Sales Endpoints
GET  /sales
POST /sales
GET  /sales/:id
POST /sales/:id/cancel
Creating a sale should execute the complete transactional workflow.
________________________________________
45. Customer Endpoints
GET    /customers
POST   /customers
GET    /customers/:id
PATCH  /customers/:id
DELETE /customers/:id
________________________________________
46. Payment Endpoints
POST /sales/:saleId/payments
GET  /customers/:customerId/payments
Payment recording must update the relevant outstanding balance.
________________________________________
47. Expense Endpoints
GET    /expenses
POST   /expenses
GET    /expenses/:id
PATCH  /expenses/:id
DELETE /expenses/:id
________________________________________
48. Report Endpoints
GET /reports/sales
GET /reports/expenses
GET /reports/inventory
GET /reports/performance
Filters should initially support:
today
yesterday
this week
this month
custom date range
________________________________________
49. API Response Structure
Successful response:
{
  "success": true,
  "data": {},
  "message": "Sale created successfully."
}
Error:
{
  "success": false,
  "message": "Not enough stock available.",
  "code": "INSUFFICIENT_STOCK"
}
The exact response format can follow the existing project's framework conventions if they are sound, but the new API must remain consistent.
________________________________________
50. Validation Layers
Validation should happen at three levels.
Frontend
For immediate user feedback.
Backend
For security and business rules.
Database
For data integrity.
Never rely exclusively on frontend validation.
________________________________________
51. Backend Service Structure
A clean architecture could follow:
backend/
│
├── controllers/
├── services/
├── repositories/
├── models/
├── routes/
├── middleware/
├── validators/
├── utils/
├── types/
├── config/
└── database/
The exact folder names can adapt to the existing project's framework.
________________________________________
52. Business Logic Location
Important business logic should live on the backend/service layer.
Examples:
calculateSaleTotal()
validateStock()
createSale()
cancelSale()
recordPayment()
calculateCustomerBalance()
adjustInventory()
calculateEstimatedProfit()
Do not duplicate critical business logic independently across multiple frontend screens.
________________________________________
53. Frontend Data Architecture
Frontend should separate:
Server state
•	Products
•	Sales
•	Customers
•	Expenses
•	Dashboard data
from:
UI state
•	Modal open/closed
•	Selected tab
•	Search input
•	Filter state
•	Form state
Avoid turning the application into one huge global state store.
________________________________________
54. Security Requirements
The MVP must include:
•	Secure authentication
•	Protected routes
•	Backend authorization
•	Business-level data isolation
•	Server-side validation
•	Secure password handling
•	HTTPS in production
•	Secure environment variables
•	Controlled file uploads
•	Audit logging
•	Database backups
•	Error logging without sensitive data exposure
Never commit:
.env
API secrets
database passwords
private keys
authentication secrets
________________________________________
55. File Storage
The MVP may require storage for:
•	Business logo
•	Product image
•	Generated receipt
Storage should not be tightly coupled to the application server filesystem if the deployment architecture is cloud-based.
Store the resulting URL/reference in the database.
________________________________________
56. Soft Deletion
For business-critical records, avoid hard deletion when it would destroy historical information.
For example:
Product
Instead of:
DELETE FROM products
prefer:
status = inactive
This allows old sales to continue referencing the product.
The same principle can apply to:
•	Customers
•	Categories
•	Staff
________________________________________
57. Data Lifecycle
Example product lifecycle:
Created
   ↓
Active
   ↓
Used in Sales
   ↓
Out of Stock
   ↓
Inactive
Historical sales remain intact.
________________________________________
58. Database Migration Strategy
Because we are rebuilding inside the existing TraderERP project:
Step 1
Create a Git checkpoint/tag/branch of the existing version.
Step 2
Document:
•	Existing database
•	Environment variables
•	Authentication
•	Storage
•	Deployment
•	Domains
•	Existing integrations
Step 3
Create the new MVP schema.
Step 4
Test the schema independently.
Step 5
Connect the new backend.
Step 6
Connect the new frontend.
Step 7
Only migrate legacy data that is genuinely useful.
________________________________________
59. Legacy Data Rule
The old application's database should not automatically become the source of truth.
The new MVP schema is authoritative.
Legacy data should only be migrated if:
1.	It is useful.
2.	It maps cleanly.
3.	It does not compromise the new architecture.
4.	It is required for continuity.
Otherwise:
Start the new MVP with clean data.
________________________________________
60. Test Data
Development/test records must be clearly separated from real business data.
Example:
Development
Staging
Production
Never mix:
demo sale
with:
real business sale
________________________________________
61. Core Database Test
Before moving to UI integration, the backend must pass this scenario:
Create Business
       ↓
Create Product
       ↓
Add 10 Stock
       ↓
Create Customer
       ↓
Create Sale of 3
       ↓
Pay 5
       ↓
Outstanding = 10
       ↓
Stock = 7
       ↓
Record Payment 10
       ↓
Outstanding = 0
       ↓
Dashboard reflects transaction
If this works correctly, the most important TraderERP business relationship is working.
________________________________________
62. Critical Failure Tests
The system must also test:
Insufficient stock
Stock = 2
Sale = 5

→ Reject sale
→ Stock remains 2
Failed sale transaction
Any critical operation fails
→ Rollback entire transaction
Unauthorized business access
User A
→ attempts User B's product

→ Reject
Duplicate SKU
Same business
→ same SKU

→ Reject
Payment exceeding balance
Balance = ₦5,000
Payment = ₦7,000

→ Reject
Cancelled sale
Sale = 3 units
Stock decreases by 3

Cancel sale
→ Stock increases by 3
→ Sale becomes cancelled
→ reversal movement created
________________________________________
63. Performance Requirements
The MVP should:
•	Paginate large lists.
•	Avoid fetching unnecessary columns.
•	Use indexed business queries.
•	Avoid N+1 database queries.
•	Cache only where genuinely useful.
•	Optimize images.
•	Avoid loading the entire sales history on dashboard load.
The application should feel fast on normal Nigerian mobile internet conditions.
________________________________________
64. Backup & Recovery
Production database should have:
•	Automated backups
•	Point-in-time recovery where supported
•	Recovery procedure documented
•	Separate production and development databases
Backup strategy should be configured before real users are onboarded.
________________________________________
65. Final MVP Database Scope
The final initial schema is:
AUTH
├── users
├── businesses
└── business_members

PRODUCT & INVENTORY
├── categories
├── products
└── inventory_movements

CUSTOMERS
└── customers

SALES
├── sales
├── sale_items
├── payments
└── receipts

EXPENSES
├── expense_categories
└── expenses

SECURITY / AUDIT
└── audit_logs
This is enough to support the MVP without turning TraderERP into a full enterprise ERP.
________________________________________
66. What We Are Deliberately NOT Building Yet
The database should not be overloaded with tables for:
•	Payroll
•	Full accounting
•	General ledger
•	Tax engine
•	Multi-branch operations
•	Supplier management
•	Purchase orders
•	Advanced procurement
•	Manufacturing
•	Advanced CRM
•	AI recommendations
•	Complex financial reconciliation
•	Enterprise workflows
•	Marketplace integrations
•	Advanced subscription billing
Those can come later if validation supports them.
________________________________________
67. Final Architecture
The rebuilt TraderERP should effectively operate like this:
                    TRADERERP
                        │
             ┌──────────┴──────────┐
             │                     │
       Authentication         Business
             │                 Workspace
             │                     │
             └──────────┬──────────┘
                        │
        ┌───────────────┼────────────────┐
        │               │                │
     INVENTORY        SALES           EXPENSES
        │               │                │
     Products       Customers         Categories
        │               │                │
     Stock          Payments         Expenses
        │               │                │
        └───────────────┼────────────────┘
                        │
                     REPORTS
                        │
                    DASHBOARD
And the most important operational relationship is:
PRODUCT
   ↓
INVENTORY
   ↓
SALE
   ↓
PAYMENT
   ↓
CUSTOMER / CREDIT
   ↓
DASHBOARD
   ↓
REPORTS
That becomes the technical backbone of the new TraderERP MVP.

