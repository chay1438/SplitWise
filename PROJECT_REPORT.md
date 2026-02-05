# Group Expense Management System - Project Report
## Technical Implementation and Requirement Verification

---

### **1. Executive Summary**
This report details the technical implementation of the Group Expense Management System ("Splitty"), a React Native application backed by Supabase. The system is designed to facilitate accurate tracking, splitting, and settlement of shared expenses among groups of users. This document verifies that the delivered solution matches the functional specifications and use cases outlined in the requirements.

---

### **2. Technology Stack**

This application utilizes a modern, robust, and scalable technology stack:

#### **Frontend (Mobile Application)**
*   **Framework:** React Native (Expo SDK 50+) via Expo Dev Client.
*   **Language:** TypeScript (for type safety and reducing runtime errors).
*   **State Management:** Redux Toolkit + Redux Persist (Offline support).
*   **Navigation:** React Navigation v7 (Stack & Tab infrastructure).
*   **UI Components:** Custom "Rich Aesthetic" components (Glassmorphism, Gradients) using basic StyleSheet.
*   **Key Libraries:** `expo-contacts` (Friend finding), `expo-image-picker` (Receipts/Avatars).

#### **Backend (Database & Auth)**
*   **Platform:** Supabase (Managed PostgreSQL).
*   **Database:** PostgreSQL 15.
*   **Security:** Row Level Security (RLS) Policies for strict data access control.
*   **Authentication:** Supabase Auth (Email/Password + OAuth capable).
*   **Storage:** Supabase Storage (Buckets for Profile Pictures & Receipt Images).

---

### **3. Requirement Verification Matrix**

| **Requirement Component** | **Specification** | **Implementation Status** | **Technical Detail** |
| :--- | :--- | :--- | :--- |
| **User Accounts** | Unique account for every member (A, B, C...). | ✅ **Completed** | Implemented via `auth.users` and public `profiles` table. |
| **Expense Entry** | Module to input expenses and specify sharing. | ✅ **Completed** | `AddExpenseScreen` with Amount, Payer, Description, and Split Logic. |
| **Equal Split** | Divide expense equally among all members. | ✅ **Completed** | Auto-calc logic: `Total / N`. Stored in `expense_splits`. |
| **Selective Split** | Divide expense among subset of members. | ✅ **Completed** | Users can checkbox/uncheck members during creation. |
| **Individual Allocation** | Allocate specific amounts to specific people. | ✅ **Completed** | "Unequal" split mode allows manual entry of amounts. |
| **Credit/Debit Tracking** | Record who paid and how much each owes. | ✅ **Completed** | SQL View `group_balances_view` aggregates credits vs. debits. |
| **Summary Reports** | Detailed summaries of balances. | ✅ **Completed** | Dashboard shows "You Owe" / "Owes You" & Detailed Group Balances. |
| **Data Security** | Secure storage and data integrity. | ✅ **Completed** | PostgreSQL Constraints (checks) & RLS Policies. |

---

### **4. Detailed Functional Implementation**

#### **4.1 Expense & Splitting Logic**
The core "Engine" of the application relies on two database tables: `expenses` (The Header) and `expense_splits` (The Distribution).

**Use Case 1: Equal Split**
*   **Scenario:** User A pays 200 for A, B, C, D.
*   **System Action:**
    *   Creates record in `expenses`: Amount 200, Payer A.
    *   Creates 4 records in `expense_splits`: A(50), B(50), C(50), D(50).
    *   **Result:** A is creditor (+150), B/C/D are debtors (-50 each).

**Use Case 2: Selective Split**
*   **Scenario:** User B pays 150 for B, C.
*   **System Action:**
    *   Creates record in `expenses`: Amount 150, Payer B.
    *   Creates records in `expense_splits`: B(75), C(75).
    *   **Result:** B is creditor (+75), C is debtor (-75).

**Use Case 3: Individual Allocation**
*   **Scenario:** User C pays 100 for A, D (C involves 0).
*   **System Action:**
    *   Creates record in `expenses`: Amount 100, Payer C.
    *   Creates records in `expense_splits`: A(50), D(50).
    *   **Result:** C is creditor (+100), A is debtor (-50), D is debtor (-50).

#### **4.2 Balance Calculation Engine**
We implemented a complex **SQL View** (`group_balances_view`) to handle real-time calculations without impacting mobile performance.

```sql
Net Balance = (Total Paid by User) - (Total Splits Assigned to User) + (Settlements Received) - (Settlements Paid)
```
*   **Positive Balance:** "You are owed" (Green).
*   **Negative Balance:** "You owe" (Red).

---

### **5. Additional Features Implemented**
Beyond the core requirements, the following features were delivered to enhance UX:
1.  **Friend Matching:** Scans phone contacts to find existing app users.
2.  **Activity Feed:** A timeline of all actions (Expenses joined, Groups created).
3.  **Settlements:** dedicated "Settle Up" flow to record debt repayments.
4.  **Notification System:** Internal inbox for tracking relevant updates.
5.  **Global Search:** Ability to search across expenses, groups, and friends.

---

### **6. Conclusion**
The application **fully adheres** to the provided functional specifications. It correctly handles the complex mathematics of expense splitting (Equal/Selective/Individual) and provides the required reporting facilities through a secure, user-friendly mobile interface.
