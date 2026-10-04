TraderERP MVP — Technical Requirements Document (TRD)
Version: 1.0
Status: Build Specification
Strategy: Clean rebuild inside the existing TraderERP project folder
Product Stage: MVP / Validation
This TRD translates the MVP PRD into the technical structure we will actually build.
________________________________________
1. Technical Objective
Rebuild TraderERP inside the existing project while replacing the legacy application logic with a cleaner MVP architecture.
The technical implementation must prioritize:
•	reliability
•	simplicity
•	security
•	maintainability
•	clear data relationships
•	mobile responsiveness
•	fast core workflows
•	strict business-data isolation
The system should be built so that additional features can be added later without forcing another major rewrite.
________________________________________
2. Recommended Architecture
Use a clear application separation:
TraderERP
│
├── Frontend
│
├── Backend / API
│
├── Database
│
├── Authentication
│
├── Storage
│
└── Deployment
Conceptually:
User
  │
  ▼
Web Application
  │
  ▼
API / Server
  │
  ├──────────────► Authentication
  │
  ├──────────────► Business Logic
  │
  ├──────────────► Database
  │
  └──────────────► File/Receipt Storage
The frontend must never be trusted with authorization decisions.
________________________________________
3. Existing Project Rule
The current project folder remains the official TraderERP repository.
Before implementation:
Current TraderERP
       │
       ├── Backup / Git checkpoint
       │
       ├── Existing infrastructure reviewed
       │
       └── Legacy application replaced
                    │
                    ▼
              New TraderERP MVP
Do not create a completely separate TraderERP repository unless there is a technical reason that makes the existing repository unusable.
________________________________________
4. Technology Direction
The final stack should respect the technologies already available in the project where they remain technically suitable.
The preferred architecture is:
Frontend
Modern React-based web application.
Responsibilities:
•	UI
•	routing
•	forms
•	client-side state
•	API communication
•	responsive interface
•	validation feedback
Backend
API-based backend responsible for:
•	authentication/session verification
•	authorization
•	business logic
•	validation
•	transaction processing
•	inventory calculations
•	reporting queries
•	audit logging
Database
Relational database.
The data model is relational because TraderERP contains relationships between:
•	businesses
•	users
•	products
•	sales
•	sale items
•	customers
•	payments
•	expenses
•	inventory movements
Storage
Used for:
•	business logo
•	optional product images
•	generated receipt files where required
________________________________________
5. Multi-Tenant Architecture
TraderERP is a multi-business platform.
The fundamental rule is:
Every business owns its operational data.
Example:
Business A
 ├── Products
 ├── Sales
 ├── Customers
 └── Expenses

Business B
 ├── Products
 ├── Sales
 ├── Customers
 └── Expenses
Business A must never be able to access Business B's records.
________________________________________
6. Tenant Resolution
Every authenticated request should resolve:
Authenticated User
       ↓
Business Membership
       ↓
Business ID
       ↓
Authorized Resource
Backend queries must always include business scope.
Conceptually:
SELECT *
FROM products
WHERE business_id = current_business_id;
Never rely solely on:
frontend filtering
for tenant isolation.
________________________________________
7. Authentication
Authentication must support:
•	registration
•	login
•	logout
•	password reset
•	session/token management
•	authenticated route protection
Authentication states
Unauthenticated
      ↓
Login / Register
      ↓
Authenticated
      ↓
Business Workspace
Protected pages should redirect unauthenticated users to the authentication flow.
________________________________________
8. Authorization
Authentication answers:
Who are you?
Authorization answers:
What are you allowed to do?
Initial roles:
Owner
Full access to the business.
Admin
Operational/business-management access.
Staff
Limited operational access.
Permissions should eventually be represented explicitly rather than hardcoding role names throughout the application.
Example:
products.view
products.create
products.update

sales.view
sales.create
sales.cancel

expenses.view
expenses.create

customers.view
customers.create

reports.view
________________________________________
9. Core Database Model
The initial database should contain the following major entities.
users
businesses
business_members
roles / permissions

products
categories
inventory_movements

customers

sales
sale_items
payments

expenses
expense_categories

receipts

audit_logs
________________________________________
10. Users
users
------
id
name
email
phone
password/auth_provider
avatar
status
created_at
updated_at
Authentication-provider-specific fields should follow the chosen authentication implementation.
Do not duplicate authentication logic unnecessarily if the existing infrastructure already provides it securely.
________________________________________
11. Businesses
businesses
----------
id
name
business_type
owner_id
phone
email
address
currency
logo_url
status
created_at
updated_at
Every business-owned entity should ultimately reference a business_id.
________________________________________
12. Business Membership
Instead of assuming that every user is permanently tied to one business, structure the system so the platform can support membership properly.
business_members
----------------
id
business_id
user_id
role_id
status
created_at
updated_at
This gives TraderERP room to support additional staff and business users later.
________________________________________
13. Products
products
--------
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
Important
current_stock can be maintained for fast reads, but stock changes must also be represented through inventory movements.
________________________________________
14. Categories
categories
----------
id
business_id
name
description
status
created_at
updated_at
Categories must be business-specific.
________________________________________
15. Inventory Movements
inventory_movements
-------------------
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
Possible movement types:
opening_stock
stock_addition
sale
sale_reversal
manual_adjustment
This creates an auditable inventory history.
________________________________________
16. Customers
customers
---------
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
Customer balances should preferably be calculated from transactional records rather than manually edited whenever possible.
________________________________________
17. Sales
sales
-----
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
Possible statuses:
completed
cancelled
Possible payment statuses:
paid
partial
credit
________________________________________
18. Sale Items
sale_items
----------
id
sale_id
product_id
product_name_snapshot
quantity
unit_price
discount
subtotal
created_at
Why snapshot the product name/price?
If the product is renamed or its selling price changes later, historical sales should still show what was actually sold.
________________________________________
19. Payments
payments
--------
id
business_id
sale_id
customer_id
amount
payment_method
reference
recorded_by
created_at
For credit payments, the payment history must remain traceable.
________________________________________
20. Expenses
expenses
--------
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
________________________________________
21. Expense Categories
expense_categories
------------------
id
business_id
name
description
status
created_at
updated_at
________________________________________
22. Receipts
A receipt does not necessarily need to become a large independent accounting entity.
It can reference the corresponding sale.
receipts
--------
id
business_id
sale_id
receipt_number
generated_at
file_url
The actual receipt should derive its transactional information from the sale.
________________________________________
23. Audit Logs
audit_logs
----------
id
business_id
user_id
action
entity_type
entity_id
metadata
created_at
Examples:
PRODUCT_CREATED
STOCK_ADJUSTED
SALE_CREATED
SALE_CANCELLED
EXPENSE_CREATED
CUSTOMER_CREATED
PAYMENT_RECORDED
STAFF_UPDATED
________________________________________
24. Database Integrity
Use database constraints wherever possible.
Examples:
•	required fields
•	unique SKU within business
•	unique sale number within business
•	valid foreign keys
•	positive quantities where applicable
•	valid monetary values
•	valid statuses
Do not rely entirely on frontend validation.
________________________________________
25. Transaction Processing
Sales must be handled as an atomic operation.
Conceptually:
BEGIN TRANSACTION

Create Sale
      ↓
Create Sale Items
      ↓
Validate Stock
      ↓
Reduce Stock
      ↓
Create Inventory Movements
      ↓
Create Payment
      ↓
Update Customer Balance/credit records
      ↓
Create Receipt reference

COMMIT
If something fails:
ROLLBACK
This prevents situations where:
•	sale exists but stock wasn't reduced
•	stock reduced but sale wasn't created
•	payment recorded but sale failed
________________________________________
26. Inventory Rules
When selling a product:
new_stock =
current_stock - quantity_sold
The system must prevent negative inventory unless a future business rule explicitly allows it.
If:
current_stock < quantity_sold
the system should return a clear message:
Not enough stock available for this product.
________________________________________
27. Stock Adjustment
Manual adjustment must require a reason.
Example:
Product: Nike Air
Current Stock: 20
Adjustment: -2
Reason: Damaged items
The system records:
20 → 18
and creates an inventory movement.
________________________________________
28. Credit Sales
For a credit sale:
Sale Total = ₦20,000
Amount Paid = ₦8,000

Balance Due = ₦12,000
The system should automatically calculate:
balance_due = total - amount_paid
The user should not manually type the resulting balance.
________________________________________
29. Credit Payment
If the customer later pays:
Previous Balance = ₦12,000
Payment = ₦5,000

New Balance = ₦7,000
Every payment must remain recorded.
________________________________________
30. Dashboard API Requirements
Dashboard data should be generated from actual business records.
Potential endpoints:
GET /dashboard/summary
GET /dashboard/sales
GET /dashboard/expenses
GET /dashboard/low-stock
GET /dashboard/recent-sales
Avoid creating duplicate dashboard data unless necessary for performance.
________________________________________
31. API Structure
Recommended structure:
/api/v1
Example:
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
32. Example API Endpoints
Products
GET    /products
POST   /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id
Inventory
GET  /inventory
POST /inventory/adjustments
GET  /inventory/movements
Sales
GET  /sales
POST /sales
GET  /sales/:id
POST /sales/:id/cancel
Customers
GET   /customers
POST  /customers
GET   /customers/:id
PATCH /customers/:id
Expenses
GET   /expenses
POST  /expenses
GET   /expenses/:id
PATCH /expenses/:id
DELETE /expenses/:id
Reports
GET /reports/sales
GET /reports/inventory
GET /reports/expenses
GET /reports/profit
GET /reports/customers
________________________________________
33. API Response Format
Keep responses consistent.
Example:
{
  "success": true,
  "data": {},
  "message": "Sale created successfully."
}
Errors:
{
  "success": false,
  "message": "Not enough stock available.",
  "error": {
    "code": "INSUFFICIENT_STOCK"
  }
}
Exact implementation can follow the backend framework's conventions, but consistency is mandatory.
________________________________________
34. Frontend Structure
Recommended conceptual structure:
src/
│
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
│
├── services/
├── hooks/
├── utils/
├── types/
└── assets/
Feature-based organization is preferred because TraderERP will continue growing.
________________________________________
35. Frontend State
Separate:
Server state
Data retrieved from the backend:
•	products
•	sales
•	customers
•	expenses
•	dashboard
•	reports
UI state
Local interface state:
•	modal open/closed
•	selected product
•	form state
•	filters
•	sidebar state
Do not put the entire application into one giant global state.
________________________________________
36. Form Validation
Forms must validate:
•	required fields
•	numbers
•	quantities
•	prices
•	phone/email where relevant
•	duplicate/conflicting values
•	invalid business operations
Validation should exist at:
Frontend
+
Backend
+
Database constraints where applicable
________________________________________
37. Error Handling
Users should receive understandable errors.
Bad:
500 Internal Server Error
Better:
Something went wrong while saving the sale. Please try again.
Technical details should go to logs, not the user's interface.
________________________________________
38. Loading States
Every asynchronous operation should have appropriate loading states.
Examples:
•	loading dashboard
•	saving product
•	processing sale
•	loading sales
•	generating receipt
•	loading reports
Avoid blank screens while requests are running.
________________________________________
39. Empty States
Every major module needs a useful empty state.
Example:
Products
No products yet. Add your first product to start tracking inventory.
With:
Add Product
Not just:
No data.
________________________________________
40. Security Requirements
Minimum requirements:
•	secure authentication
•	password protection through the chosen auth provider
•	authorization checks
•	tenant isolation
•	server-side validation
•	protected API routes
•	secure environment variables
•	no secrets in frontend source
•	controlled file uploads
•	audit logs for important actions
•	HTTPS in deployment
•	database backups
•	safe error responses
________________________________________
41. Environment Configuration
Sensitive configuration must use environment variables.
Examples:
DATABASE_URL
AUTH_SECRET
STORAGE_URL
STORAGE_KEY
API_BASE_URL
Never commit:
passwords
private API keys
database credentials
production secrets
into Git.
________________________________________
42. Existing Environment Audit
Before rebuilding, document the existing project's:
•	.env
•	database provider
•	authentication provider
•	storage
•	deployment platform
•	domain configuration
•	API endpoints
•	third-party integrations
•	existing migrations
We preserve useful infrastructure where possible.
________________________________________
43. Migration Strategy
We are not doing a blind database migration.
The new MVP schema should be treated as the source of truth.
If old data is valuable:
Legacy Database
      ↓
Data Mapping
      ↓
Validation
      ↓
New Schema
      ↓
Imported Data
If old data is test/demo data and has no validation value, it should not contaminate the new MVP database.
________________________________________
44. Legacy Code Strategy
For every existing feature:
Keep
If it is:
•	technically sound
•	compatible with the new architecture
•	useful to the MVP
Refactor
If:
•	the underlying idea is useful
•	implementation quality is poor
Replace
If:
•	workflow is wrong
•	architecture is unsuitable
•	feature conflicts with the new MVP
Remove
If:
•	it is out of scope
•	creates unnecessary complexity
•	is unvalidated
________________________________________
45. Deployment Environments
At minimum:
Development
     ↓
Staging / Preview
     ↓
Production
Development should never directly manipulate production data.
________________________________________
46. Testing Strategy
Unit testing
Test:
•	calculations
•	inventory logic
•	credit calculations
•	permission functions
•	validation
Integration testing
Test:
•	sale → inventory
•	sale → payment
•	credit → customer balance
•	expense → reports
•	stock adjustment → inventory history
End-to-end testing
Test complete workflows.
Example:
Register
↓
Create Business
↓
Add Product
↓
Add Stock
↓
Make Sale
↓
Inventory Reduces
↓
Receipt Generated
↓
Dashboard Updates
________________________________________
47. Critical E2E Test
This should be one of the first complete tests:
Business Setup
       ↓
Create Product
       ↓
Add 10 Units
       ↓
Create Customer
       ↓
Sell 3 Units
       ↓
Customer Pays Partially
       ↓
Receipt Generated
       ↓
Inventory = 7
       ↓
Outstanding Balance Correct
       ↓
Dashboard Reflects Sale
If this works reliably, we have a meaningful foundation.
________________________________________
48. Performance
MVP performance targets should include:
•	fast initial application load
•	efficient database queries
•	pagination for large datasets
•	indexed business-scoped queries
•	optimized images
•	no unnecessary API requests
Do not prematurely optimize everything.
Optimize actual bottlenecks.
________________________________________
49. Database Indexing
Likely indexes:
business_id
business_id + created_at
business_id + status
business_id + sku
business_id + phone
sale_id
customer_id
product_id
Exact indexes should be finalized after reviewing the chosen database engine and query patterns.
________________________________________
50. UI/UX Technical Requirement
The UI must follow the product principle:
Business software should feel simpler after using it, not more complicated.
The design system should establish:
•	typography
•	spacing
•	buttons
•	inputs
•	cards
•	tables
•	badges
•	modals
•	alerts
•	navigation
•	responsive breakpoints
•	form patterns
We should not design every page independently.
________________________________________
51. Core UX Flow
The most important workflow is:
Dashboard
    ↓
New Sale
    ↓
Select Product
    ↓
Select Customer
    ↓
Enter Quantity
    ↓
Payment
    ↓
Confirm
    ↓
Receipt
The user should not need to navigate through five unrelated pages to complete a sale.
________________________________________
52. Inventory UX
Product creation should be simple.
Example:
Add Product

Product name
SKU
Category
Purchase price
Selling price
Opening stock
Minimum stock

[Save Product]
Avoid forcing users through unnecessary multi-step forms.
________________________________________
53. Dashboard UX
The dashboard should not become a dumping ground for every piece of data.
Prioritize:
Today's Sales
Expenses
Estimated Profit
Low Stock
Outstanding Credit
Recent Activity
Then allow users to explore deeper through reports.
________________________________________
54. Reports UX
Reports should answer business questions.
Not:
"Here are 17 charts."
But:
"How much did I sell this month?"
"Which products are selling?"
"What do I currently have in stock?"
"How much do customers owe me?"
"Where is my money going?"
________________________________________
55. MVP Acceptance Test
Before calling TraderERP MVP-ready:
Authentication
•	Registration works
•	Login works
•	Logout works
•	Password recovery works
Business
•	Business can be created
•	Business profile can be updated
•	Data is isolated
Inventory
•	Product creation works
•	Stock addition works
•	Stock adjustment works
•	Stock history works
•	Low-stock detection works
Sales
•	Sale creation works
•	Stock decreases
•	Payment works
•	Credit sale works
•	Receipt works
•	Sale history works
•	Cancellation works safely
Expenses
•	Expense creation works
•	Categories work
•	Expense history works
Customers
•	Customer creation works
•	Customer history works
•	Credit balance works
•	Payments update balance
Dashboard
•	Sales summary works
•	Expense summary works
•	Estimated profit works
•	Low-stock data works
Reports
•	Sales report works
•	Inventory report works
•	Expense report works
•	Customer/credit report works
Security
•	Authorization works
•	Tenant isolation works
•	Staff permissions work
•	Secrets are protected
UX
•	Desktop works
•	Mobile works
•	Loading states work
•	Error states work
•	Empty states work
________________________________________
56. Build Sequence
Now we should not jump straight into random UI coding.
The proper sequence is:
TRD
 ↓
Database Schema
 ↓
Backend/API Architecture
 ↓
UI/UX Design System
 ↓
Page/Screen Specifications
 ↓
Implementation
 ↓
Testing
 ↓
Deployment
 ↓
MVP Validation
Next document: UI/UX Design Specification
That should define the actual screens before implementation:
1. Design direction
2. Brand/design system
3. Typography
4. Colors
5. Spacing
6. Buttons
7. Forms
8. Tables
9. Dashboard
10. Sales screens
11. Inventory screens
12. Expense screens
13. Customer screens
14. Credit screens
15. Reports
16. Staff
17. Settings
18. Mobile navigation
19. Responsive behaviour
20. Empty/loading/error states
21. Complete screen map
22. Component system

