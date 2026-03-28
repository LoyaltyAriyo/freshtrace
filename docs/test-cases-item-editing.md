# Item Editing Test Cases – Review Flow

This document describes manual/functional test cases for editing items on the **Review Extracted Items** page in the FreshTrace client.  
Scope: editing existing extracted items and newly added draft items (name, quantity, category), including validation and save behavior.

---

## TC-EDIT-01 – Resolve “Needs review” by fixing missing name

- **Given** user is on the review page with at least one extracted item selected that shows **Needs review** because its name is blank or whitespace and the inline issue “Item name is missing or blank.” is displayed  
- **When** user types a non-empty name into the **Name** input for that item  
- **Then** the item’s display name updates, the **Needs review** badge and the “Item name is missing or blank.” issue disappear for that item, and the item is eligible to be saved when the user confirms

---

## TC-EDIT-02 – Resolve invalid quantity and allow save

- **Given** user is on the review page with a selected item whose **Quantity** has been edited to `0` or a negative value so that it shows the inline issue “Quantity should be at least 1.” and a **Needs review** badge  
- **When** user updates the **Quantity** input to a valid positive whole number (e.g., from `0` to `2`)  
- **Then** the inline quantity issue and **Needs review** badge are removed for that item, the summary text reflects the new quantity (e.g., `Qty: 2`), and clicking **Confirm items** proceeds without a validation error related to quantity

---

## TC-EDIT-03 – Set missing category and clear category-related issues

- **Given** user is on the review page with a selected item that has no category (Category summary shows “Not set”, the **Category** select is on “Select category”, and “Category has not been set.” appears as an issue with a **Needs review** badge)  
- **When** user opens the **Category** dropdown for that item and chooses a valid category from the list  
- **Then** the Category summary displays the chosen category name, the “Category has not been set.” issue and **Needs review** badge (when caused solely by missing category) disappear, and the item can be included in a successful save

---

## TC-EDIT-04 – Edit multiple fields on multiple items and save

- **Given** user is on the review page with at least two selected items that currently have valid name, quantity, and category values and no blocking issues  
- **When** user edits the **Name**, **Quantity**, and **Category** fields on both selected items (e.g., changes names, increases quantities, and switches each to a different valid category) and clicks **Confirm items**  
- **Then** the list reflects the new names, quantities, and categories for both items, no **Needs review** issues are shown for them, and the save request payload includes both item IDs in `selectedItemIds` with their edited values in `editedItems`, while unedited items remain unchanged

---

## TC-EDIT-05 – Block save when selected item name is cleared

- **Given** user is on the review page with a selected item that initially has a valid name and no blocking issues  
- **When** user deletes the name (or replaces it with only spaces) in the **Name** input for that selected item and then clicks **Confirm items**  
- **Then** the item is marked with **Needs review**, the inline issue “Item name is missing or blank.” appears, a save error banner is shown indicating that some selected items still need review (or equivalent copy), and no POST request is sent to the review API until the name is corrected or the item is deselected

---

## TC-EDIT-06 – Decimal quantity is normalized before saving

- **Given** user is on the review page with a selected item that has a valid name and category and shows no issues  
- **When** user types a decimal value (e.g., `2.5`) into the **Quantity** input and clicks **Confirm items**  
- **Then** the item remains saveable (no “Quantity should be at least 1.” issue), the saved quantity sent to the backend is normalized to a whole number (e.g., `2`), and the item is created with that integer quantity while other fields (name, category) remain unchanged

---

## TC-EDIT-07 – Missing category prevents save and shows specific error

- **Given** user is on the review page with at least one selected item that initially has a valid category  
- **When** user changes that item’s category back to the “Select category” option (clearing the category) and then clicks **Confirm items**  
- **Then** the item is marked **Needs review** with the inline issue “Category has not been set.”, the page shows a save error banner explaining that some selected items still need review and must be fixed or deselected, and no save request is sent until a valid category is assigned or the item is deselected

---

## TC-EDIT-08 – Invalid edits on unselected items do not block saving

- **Given** user is on the review page with at least two items, where only one item is selected; both have initially valid data and no issues  
- **When** user edits the unselected item to an invalid state (e.g., clears the name or sets quantity to `0` so it shows **Needs review**) but leaves the selected item valid and then clicks **Confirm items**  
- **Then** the save proceeds successfully for the selected item only, the invalid unselected item remains in the list with its **Needs review** status and inline issues, `selectedItemIds` in the payload includes only the selected item’s ID, and the presence of issues on unselected items does not block saving

---

## TC-EDIT-09 – Edit after removing another item

- **Given** user is on the review page with at least two selected items with valid data and no issues  
- **When** user removes one item using its **Remove** button and then edits the remaining item’s fields (e.g., updates quantity and category) before clicking **Confirm items**  
- **Then** the removed item disappears from the list and is not included in `selectedItemIds`, the remaining edited item shows the updated values, the save payload only includes the remaining item (with its edited values), and the saved count reflects the number of remaining selected items only

---

## TC-EDIT-10 – Edit newly added item before saving

- **Given** user is on the review page with at least one existing selected item and category options available  
- **When** user uses the “Add an item that was missed” form to add a new item (with valid name, quantity, and category), then edits one or more of that new item’s inline fields (e.g., adjusts quantity or changes category) and finally clicks **Confirm items**  
- **Then** the newly added item appears in the list with the latest edited values, is selected by default, is included in the save payload under `addedItems` with its updated values, existing items are included or excluded based on their selection and edits, and no duplicate copies of the new item are created

---

## TC-EDIT-11 – Revert edits back to original values

- **Given** user is on the review page with a selected item that has valid initial name, quantity, and category and no issues  
- **When** user changes one or more fields (e.g., edits **Name** and **Quantity**), observes the UI update, and then manually restores those fields to their original values before clicking **Confirm items**  
- **Then** the item displays its original values again, shows no **Needs review** badge or issues, the confirm action succeeds without validation errors, and the saved data for that item matches the original values (i.e., editing and reverting did not introduce data loss or unintended changes)

---

## TC-EDIT-12 – Preserve unedited fields while updating edited ones

- **Given** user is on the review page with a selected item whose name, quantity, and category are all valid  
- **When** user edits only one field for that item (e.g., changes the **Name** but leaves **Quantity** and **Category** unchanged) and then clicks **Confirm items**  
- **Then** the save payload for that item reflects the new name while keeping the original quantity and category values, the item displays the updated name in the UI, and no other item’s fields are modified, ensuring that only the intended fields are updated

