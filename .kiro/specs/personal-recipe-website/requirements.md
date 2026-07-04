# Requirements Document

## Introduction

The Personal Recipe Website is a single-user web application for collecting, organizing, and cooking from recipes. It replaces a manual workflow of browsing for inspiration and copying recipe details into a notes app. The application lets the user add recipes by pasting a link, pasting recipe data formatted by Claude AI (via the Owner's own Claude.ai subscription, outside this application), or entering details manually; enriches each recipe with personal metadata (rating, cost, cook notes, nutrition, labels); supports browsing and filtering that collection; and generates shopping lists that exclude common pantry staples and export to Apple Notes.

The system is built on a static frontend (GitHub Pages), a managed database and file storage backend (Supabase free tier), and a serverless proxy (Cloudflare Worker free tier) that performs link scraping. Recipe extraction from screenshots is handled outside this application: the Owner pastes a screenshot into their own Claude AI chat/project, which returns recipe data in a fixed JSON format that this application parses entirely client-side. No third-party API key or paid API call is required anywhere in this application, keeping it free to run. The application is installable as a Progressive Web App (PWA) and remains usable offline for previously loaded content.

This document covers MVP scope only. The weekly meal planner (drag recipes onto a week, auto-merged shopping list across the week) is explicitly out of scope and deferred to v2.

## Glossary

- **Recipe_Site**: The single-user web application (frontend hosted on GitHub Pages) that this document describes.
- **Recipe_Database**: The Supabase database that stores Recipe_Records, ratings, and cook notes.
- **Photo_Storage**: The Supabase storage bucket that stores recipe photos.
- **Ingestion_Worker**: The Cloudflare Worker that fetches recipe URLs and extracts structured data on behalf of the Recipe_Site.
- **Link_Parser**: The function within the Ingestion_Worker that fetches a recipe URL and extracts schema.org Recipe markup (e.g., ingredients, steps, time, servings).
- **Claude_Import_Parser**: A client-side (browser-only) function that parses Owner-pasted, Claude-AI-formatted JSON text into structured recipe data (ingredients, steps, time, servings). No network call or third-party API key is involved; the Owner obtains the JSON by pasting a screenshot or description into their own Claude AI chat/project (outside this application) using a fixed prompt/format provided by the Recipe_Site.
- **Recipe_Form**: The manual entry and edit user interface for creating or correcting a Recipe_Record.
- **Recipe_Record**: A single recipe's structured data (name, source link, photo, ingredients, method, time, servings, rating, cost per portion, cook notes, nutrition, labels) stored in the Recipe_Database.
- **Recipe_Under_Review**: A recipe whose data has been pre-filled by the Link_Parser or Screenshot_Parser (or is being manually entered) but has not yet been confirmed by the Owner and saved as a Recipe_Record. Tracked with a review-confirmed flag.
- **Shopping_List_Builder**: The Recipe_Site feature that compiles ingredients from one or more selected Recipe_Records into a single shopping list.
- **Pantry_Exclusion_List**: The configurable list of staple ingredients (e.g., salt, pepper, oil) that the Shopping_List_Builder automatically omits from generated shopping lists.
- **Ingredient_Search**: The Recipe_Site feature that returns Recipe_Records containing a user-specified ingredient.
- **PWA_Shell**: The installable Progressive Web App shell for the Recipe_Site, consisting of a web app manifest and a Service_Worker.
- **Service_Worker**: The script registered by the PWA_Shell that caches Recipe_Site assets and previously viewed Recipe_Records for offline use.
- **Owner**: The single authorized user of the Recipe_Site.

## Requirements

### Requirement 1: Add Recipe via Link

**User Story:** As the Owner, I want to paste a link to a recipe page, so that I can save the recipe without retyping its ingredients and steps.

#### Acceptance Criteria

1. IF the Owner submits a value to add a recipe that is not a well-formed URL (e.g., missing a scheme such as http:// or https://, or missing a host), THEN THE Recipe_Site SHALL reject the submission without contacting the Link_Parser and SHALL indicate that a valid URL is required.
2. WHEN the Owner submits a well-formed URL to add a recipe, THE Recipe_Site SHALL send the URL to the Link_Parser.
3. WHEN the Link_Parser extracts schema.org Recipe markup containing all of name, ingredients, method, time to cook, and servings from the fetched page, THE Recipe_Site SHALL pre-fill the Recipe_Form with the extracted values.
4. WHEN the Link_Parser extracts schema.org Recipe markup from the fetched page that is missing one or more of name, ingredients, method, time to cook, or servings, THE Recipe_Site SHALL pre-fill the Recipe_Form with the fields that were extracted and SHALL leave the remaining fields blank for manual entry.
5. IF the fetched page does not contain schema.org Recipe markup, THEN THE Recipe_Site SHALL notify the Owner that automatic extraction failed and SHALL offer the Recipe_Form for manual entry.
6. IF the Link_Parser does not receive a complete response from the submitted URL within 15 seconds, or the fetch otherwise fails, THEN THE Recipe_Site SHALL display an error message indicating that the recipe page could not be retrieved and SHALL NOT create a Recipe_Record.
7. THE Recipe_Record created from a submitted URL SHALL store the submitted URL as its source link.

### Requirement 2: Add Recipe via Pasted Claude AI Format

**User Story:** As the Owner, I want to paste recipe data that I've had Claude AI format in my own chat (e.g., from a screenshot), so that I can save recipes from sources that don't provide structured data, without this application needing any paid API or third-party key.

#### Acceptance Criteria

1. THE Recipe_Site SHALL display a fixed prompt/format template that the Owner can copy and use in their own Claude AI chat or project to convert a screenshot or description into a specific JSON shape (name, ingredients, method, time to cook, servings, optional source link).
2. WHEN the Owner pastes text into the Claude AI import field and submits it, THE Claude_Import_Parser SHALL attempt to parse the pasted text as JSON matching the documented shape, entirely client-side with no network request.
3. WHEN the Claude_Import_Parser successfully parses pasted text into the documented shape, THE Recipe_Site SHALL pre-fill the Recipe_Form with the parsed name, ingredients, method, time to cook, and servings.
4. IF the pasted text is not valid JSON, or valid JSON that does not match the documented shape, THEN THE Recipe_Site SHALL notify the Owner that the pasted text could not be parsed and SHALL offer the Recipe_Form for manual entry.
5. THE Recipe_Site SHALL offer the Recipe_Form for manual editing regardless of whether the Claude_Import_Parser succeeds or fails.
6. THE Claude_Import_Parser SHALL run entirely within the Owner's browser and SHALL NOT transmit the pasted text, or any part of it, to the Ingestion_Worker or any other server.

### Requirement 3: Add Recipe via Manual Entry

**User Story:** As the Owner, I want to manually enter a recipe's details, so that I can save recipes when automatic extraction is unavailable or incorrect.

#### Acceptance Criteria

1. THE Recipe_Form SHALL allow the Owner to enter name, source link, ingredients, method, time to cook, and servings without an automated extraction step, and SHALL treat only the name field as mandatory.
2. WHEN the Owner submits a Recipe_Form containing a non-empty, non-whitespace name, THE Recipe_Site SHALL create a new Recipe_Record from the submitted values.
3. IF the Owner submits the Recipe_Form with an empty or whitespace-only recipe name, THEN THE Recipe_Site SHALL reject the submission, SHALL indicate that a name is required, and SHALL preserve all previously entered field values so the Owner can correct and resubmit without re-entering them.
4. THE Recipe_Form SHALL constrain submitted values to the following bounds: name between 1 and 200 characters, source link up to 2048 characters, each ingredient line up to 200 characters with up to 100 ingredient lines, method text up to 10,000 characters, time to cook as an integer between 1 and 1440 minutes, and servings as an integer between 1 and 100.
5. IF a submitted name, source link, ingredient line, ingredient count, method text, time to cook, or servings value falls outside its specified bounds, THEN THE Recipe_Site SHALL reject the submission, SHALL indicate which field(s) are out of bounds, and SHALL preserve all previously entered field values so the Owner can correct and resubmit without re-entering them.

### Requirement 4: Review and Edit Recipe Before Saving

**User Story:** As the Owner, I want to review and correct extracted recipe data before it's saved, so that parsing mistakes don't end up in my collection.

#### Acceptance Criteria

1. WHEN the Link_Parser or Claude_Import_Parser returns extracted recipe data, THE Recipe_Site SHALL present the data in the Recipe_Form as a Recipe_Under_Review before creating a Recipe_Record and SHALL set the Recipe_Under_Review's review-confirmed flag to false.
2. THE Recipe_Site SHALL allow the Owner to modify the name, source link, ingredients, method, time to cook, and servings fields of a Recipe_Under_Review prior to saving.
3. WHILE a Recipe_Under_Review's review-confirmed flag is false, THE Recipe_Site SHALL NOT create a Recipe_Record from it.
4. WHEN the Owner confirms the reviewed data, THE Recipe_Site SHALL set the Recipe_Under_Review's review-confirmed flag to true and SHALL create the Recipe_Record.
5. IF the Owner confirms a Recipe_Under_Review without a recipe name, THEN THE Recipe_Site SHALL reject the confirmation and SHALL indicate that a name is required.
6. WHEN the Owner abandons a Recipe_Under_Review before confirming it, THE Recipe_Site SHALL discard the Recipe_Under_Review and SHALL NOT create a Recipe_Record from it.

### Requirement 5: Manage Saved Recipes

**User Story:** As the Owner, I want to view, edit, and delete recipes I've saved, so that I can keep my collection accurate over time.

#### Acceptance Criteria

1. WHEN the Owner selects a saved recipe, THE Recipe_Site SHALL display its full Recipe_Record, including name, source link, photo, ingredients, method, time to cook, servings, rating, cost per portion, cook notes, nutrition, and labels.
2. WHEN the Owner edits a field of a saved Recipe_Record and confirms the change, THE Recipe_Site SHALL update the Recipe_Record in the Recipe_Database.
3. IF an edit to a saved Recipe_Record would result in an empty recipe name, THEN THE Recipe_Site SHALL reject the edit and SHALL indicate that a name is required.
4. IF an update to the Recipe_Database fails while saving an edit to a Recipe_Record, THEN THE Recipe_Site SHALL leave the Recipe_Record unchanged and SHALL notify the Owner that the update failed.
5. WHEN the Owner requests deletion of a saved Recipe_Record, THE Recipe_Site SHALL prompt for confirmation before removing it.
6. WHEN the Owner confirms deletion of a Recipe_Record, THE Recipe_Site SHALL remove the Recipe_Record from the Recipe_Database.
7. IF the Recipe_Record being deleted has an associated photo in Photo_Storage, THEN THE Recipe_Site SHALL also remove that photo from Photo_Storage upon confirmed deletion.
8. IF removal of the Recipe_Record from the Recipe_Database or removal of its associated photo from Photo_Storage fails, THEN THE Recipe_Site SHALL leave both the Recipe_Record and its photo intact and SHALL notify the Owner that deletion failed.

### Requirement 6: Recipe Photo Storage

**User Story:** As the Owner, I want to attach a photo to each recipe, so that I can visually identify recipes when browsing.

#### Acceptance Criteria

1. WHEN the Owner uploads a photo file in JPEG, PNG, or WEBP format not exceeding 10 MB for a Recipe_Record, THE Recipe_Site SHALL store the photo in Photo_Storage and SHALL associate it with the Recipe_Record, replacing any previously associated photo.
2. IF the Owner uploads a photo file that is not in JPEG, PNG, or WEBP format, or that exceeds 10 MB, or if storing the photo in Photo_Storage fails, THEN THE Recipe_Site SHALL reject the upload, SHALL retain the Recipe_Record's previously associated photo (if any) unchanged, and SHALL notify the Owner that the upload failed.
3. IF a Recipe_Record has no associated photo, THEN THE Recipe_Site SHALL display a placeholder image in place of the photo.

### Requirement 7: Rate Recipes

**User Story:** As the Owner, I want to give each recipe a star rating, so that I can remember which recipes were worth repeating.

#### Acceptance Criteria

1. WHEN the Owner submits a rating value of 1, 2, 3, 4, or 5 for a Recipe_Record, THE Recipe_Site SHALL set the Recipe_Record's rating to the submitted value.
2. IF the Owner submits a rating value that is not an integer between 1 and 5 inclusive, THEN THE Recipe_Site SHALL reject the submission, SHALL leave the Recipe_Record's existing rating unchanged, and SHALL indicate that the rating is invalid.
3. THE Recipe_Site SHALL allow the Owner to change a previously set rating on a Recipe_Record to a new integer between 1 and 5 at any time after creation.
4. THE Recipe_Site SHALL allow the Owner to clear a Recipe_Record's rating back to unrated at any time after it has been set.
5. WHILE a Recipe_Record has not yet been rated or has had its rating cleared, THE Recipe_Site SHALL display it as unrated in a manner that is visually distinguishable from a Recipe_Record carrying a 1-to-5 star rating.

### Requirement 8: Track Cost per Portion

**User Story:** As the Owner, I want to record the cost per portion of a recipe, so that I can factor budget into what I cook.

#### Acceptance Criteria

1. THE Recipe_Site SHALL allow the Owner to enter a cost per portion value between 0 and 9999.99 (inclusive), with at most two decimal places, for a Recipe_Record.
2. IF the Owner submits a cost per portion value outside the range of 0 to 9999.99 or with more than two decimal places, THEN THE Recipe_Site SHALL reject the submission and SHALL indicate that the value is invalid.
3. THE Recipe_Site SHALL allow the Owner to leave the cost per portion of a Recipe_Record unset.
4. THE Recipe_Site SHALL allow the Owner to clear a previously set cost per portion value, returning it to unset.
5. WHEN the Owner filters recipes by budget, THE Recipe_Site SHALL include only Recipe_Records whose stored cost per portion value is less than or equal to the Owner-specified maximum threshold.
6. WHEN the Owner filters recipes by budget and a Recipe_Record has no cost per portion set, THE Recipe_Site SHALL include that Recipe_Record in the filtered results by treating its cost per portion as zero.

### Requirement 9: Record Cook Notes

**User Story:** As the Owner, I want to keep freeform cook notes on a recipe separate from the original recipe text, so that I can track my own adjustments without losing the source instructions.

#### Acceptance Criteria

1. THE Recipe_Site SHALL store cook notes for a Recipe_Record as a field distinct from its ingredients and method, with a maximum length of 5,000 characters.
2. THE Recipe_Site SHALL allow the Owner to add, edit, and clear cook notes on a Recipe_Record at any time, where clearing cook notes sets the field to empty without deleting the Recipe_Record.
3. WHEN the Owner views a Recipe_Record that has cook notes set, THE Recipe_Site SHALL display those cook notes separately from the original ingredients and method.
4. IF a Recipe_Record has no cook notes set, THEN THE Recipe_Site SHALL display the cook notes area as empty rather than omitting it.
5. IF a cook notes save operation fails, THEN THE Recipe_Site SHALL preserve the previously saved cook notes and display an error indication to the Owner.

### Requirement 10: Record Nutrition Information

**User Story:** As the Owner, I want to record nutrition information per serving, so that I can compare recipes on nutritional value.

#### Acceptance Criteria

1. THE Recipe_Site SHALL allow the Owner to enter calories per serving and protein per serving for a Recipe_Record, each as a numeric value zero or greater.
2. IF the Owner enters a calories per serving or protein per serving value less than zero for a Recipe_Record, THEN THE Recipe_Site SHALL reject the entry, display an error message indicating the value must be zero or greater, and retain the previously saved value for that field.
3. WHEN both calories per serving and protein per serving are set for a Recipe_Record and calories per serving is greater than zero, THE Recipe_Site SHALL calculate and display the protein-per-calorie ratio.
4. IF calories per serving or protein per serving is unset for a Recipe_Record, THEN THE Recipe_Site SHALL display the protein-per-calorie ratio as unavailable rather than as a computed value.
5. IF calories per serving is set to zero for a Recipe_Record, THEN THE Recipe_Site SHALL display the protein-per-calorie ratio as unavailable rather than attempting a division by zero.

### Requirement 11: Label and Categorize Recipes

**User Story:** As the Owner, I want to tag recipes with dietary labels, key ingredients, and meal-type categories, so that I can find suitable recipes later.

#### Acceptance Criteria

1. THE Recipe_Site SHALL allow the Owner to assign zero or more Owner-entered dietary labels (e.g., gluten free, vegetarian) to a Recipe_Record, where each dietary label is at most 50 characters and a single Recipe_Record has at most 20 dietary labels assigned.
2. THE Recipe_Site SHALL allow the Owner to assign zero or more Owner-entered key ingredient labels to a Recipe_Record, where each key ingredient label is at most 50 characters and a single Recipe_Record has at most 20 key ingredient labels assigned.
3. THE Recipe_Site SHALL allow the Owner to assign one or more filter categories to a Recipe_Record, restricted to the following fixed set of values: breakfast, lunch, dinner, healthy, quick and easy, dinner party, family, one-pot, budget.
4. IF the Owner attempts to save a Recipe_Record with zero filter categories assigned, THEN THE Recipe_Site SHALL reject the submission and SHALL indicate that at least one filter category is required.
5. IF the Owner attempts to assign a filter category value that is not in the fixed set defined in Criterion 3, THEN THE Recipe_Site SHALL reject the assignment and SHALL indicate that the value is not a valid filter category.

### Requirement 12: Browse and Filter Recipe Collection

**User Story:** As the Owner, I want to browse and filter my saved recipes by category, so that I can quickly find something suitable to cook.

#### Acceptance Criteria

1. WHEN the Owner has one or more saved Recipe_Records, THE Recipe_Site SHALL display them in a browsable list or grid, and SHALL show at least the name and photo for each displayed Recipe_Record, substituting the placeholder image defined in Requirement 6 when a Recipe_Record has no associated photo.
2. IF the Owner has no saved Recipe_Records, THEN THE Recipe_Site SHALL display a message indicating the collection is empty and SHALL NOT display the browsable list or grid.
3. WHEN the Owner selects one or more filter categories from the fixed set of filter categories defined in Requirement 11, THE Recipe_Site SHALL display only Recipe_Records matching all selected categories.
4. WHEN the Owner clears all selected filter categories, THE Recipe_Site SHALL display all saved Recipe_Records.
5. IF no saved Recipe_Record matches the Owner's selected filter categories, THEN THE Recipe_Site SHALL display only a message indicating no matching recipes were found and SHALL NOT display any Recipe_Records.

### Requirement 13: Search Recipes by Ingredient

**User Story:** As the Owner, I want to search for recipes that use a specific ingredient, so that I can decide what to cook with what I already have.

#### Acceptance Criteria

1. WHEN the Owner submits an ingredient search term of 1 to 100 characters, THE Ingredient_Search SHALL return Recipe_Records whose ingredients list contains a case-insensitive substring match for the trimmed search term.
2. IF no saved Recipe_Record contains an ingredient matching the trimmed search term, THEN THE Ingredient_Search SHALL display only a message indicating no matching recipes were found and SHALL NOT display any Recipe_Records.
3. IF the Owner submits an empty or whitespace-only search term, THEN THE Ingredient_Search SHALL display only a message indicating no matching recipes were found and SHALL NOT display any Recipe_Records.
4. IF the Owner submits a search term exceeding 100 characters, THEN THE Ingredient_Search SHALL reject the submission and SHALL indicate that the search term exceeds the maximum allowed length.

### Requirement 14: Build Shopping List

**User Story:** As the Owner, I want to build a shopping list from one or more selected recipes, so that I don't have to manually compile ingredients before shopping.

#### Acceptance Criteria

1. WHEN the Owner selects one or more Recipe_Records for a shopping list, THE Shopping_List_Builder SHALL compile a combined list containing every ingredient entry (name, quantity, and unit as stored in each Recipe_Record) from the selected Recipe_Records.
2. WHEN two or more selected Recipe_Records contain ingredient entries whose ingredient names are identical after ignoring letter case and leading/trailing whitespace, THE Shopping_List_Builder SHALL combine those entries into a single shopping list line, SHALL sum their quantities when the entries share the same unit, and SHALL display each entry's quantity and unit separately on that line when the entries specify different units or when one or more entries have no quantity specified.
3. THE Shopping_List_Builder SHALL allow the Owner to manually add a shopping list item of up to 200 characters and to remove any individual item, whether compiled or manually added, from the compiled shopping list before export.
4. IF the Owner attempts to build a shopping list without selecting any Recipe_Record, THEN THE Shopping_List_Builder SHALL NOT compile a shopping list and SHALL notify the Owner that at least one recipe must be selected.

### Requirement 15: Exclude Pantry Staples from Shopping List

**User Story:** As the Owner, I want common pantry staples automatically excluded from my shopping list, so that I don't get reminded to buy things I always have on hand.

#### Acceptance Criteria

1. WHEN the Recipe_Site creates the Pantry_Exclusion_List for the first time, THE Recipe_Site SHALL populate it with default entries of salt, pepper, and oil.
2. WHEN the Shopping_List_Builder compiles a shopping list, THE Shopping_List_Builder SHALL omit an ingredient if its name, compared case-insensitively and with leading/trailing whitespace trimmed, exactly matches an entry in the Pantry_Exclusion_List.
3. WHEN the Shopping_List_Builder compiles a shopping list, THE Shopping_List_Builder SHALL retain an ingredient on the shopping list if its name does not exactly match, per the case-insensitive and whitespace-trimmed comparison, an entry in the Pantry_Exclusion_List.
4. THE Recipe_Site SHALL allow the Owner to add entries of up to 100 characters to the Pantry_Exclusion_List and to remove existing entries.
5. IF the Owner attempts to add an entry to the Pantry_Exclusion_List whose name, compared case-insensitively and with leading/trailing whitespace trimmed, matches an existing entry, THEN THE Recipe_Site SHALL reject the addition and SHALL display a message indicating the entry already exists, leaving the Pantry_Exclusion_List unchanged.

### Requirement 16: Export Shopping List

**User Story:** As the Owner, I want to export my shopping list to my phone's Notes app, so that I have it while I'm shopping.

#### Acceptance Criteria

1. WHEN the Owner requests export of a compiled shopping list that contains one or more items, THE Recipe_Site SHALL copy the shopping list's contents to the clipboard as plain text and SHALL display a confirmation to the Owner that the shopping list was copied.
2. THE Recipe_Site SHALL format the copied shopping list as one ingredient per line, preserving the same order in which the ingredients are displayed in the compiled shopping list, to remain compatible with an Apple Shortcut that appends clipboard contents to Notes.
3. IF the Owner requests export of a compiled shopping list that contains zero items, THEN THE Recipe_Site SHALL NOT copy anything to the clipboard and SHALL notify the Owner that there are no items to export.
4. IF the Recipe_Site cannot write to the clipboard when the Owner requests export, THEN THE Recipe_Site SHALL notify the Owner that the export failed and SHALL retain the compiled shopping list unchanged.

### Requirement 17: Install and Use as Progressive Web App

**User Story:** As the Owner, I want to install the site on my phone and laptop and use it without a network connection, so that I can access my recipes anywhere.

#### Acceptance Criteria

1. THE PWA_Shell SHALL provide a web app manifest that enables the Recipe_Site to be installed to a phone home screen or a laptop/desktop.
2. THE PWA_Shell SHALL register a Service_Worker that caches the Recipe_Site's static assets.
3. WHEN the Owner loads a Recipe_Record while online, THE Service_Worker SHALL cache that Recipe_Record for offline viewing.
4. IF caching a Recipe_Record fails due to insufficient device storage, THEN THE Service_Worker SHALL discard the incomplete cache entry for that Recipe_Record and SHALL leave previously cached Recipe_Records intact.
5. IF the Owner attempts to view, while offline, a Recipe_Record that has not been previously cached, THEN THE Recipe_Site SHALL notify the Owner that the recipe is unavailable offline.
6. IF the Owner attempts an action that requires network access (such as adding a Recipe via link, uploading a photo, or signing in) while offline, THEN THE Recipe_Site SHALL notify the Owner that the action requires a network connection and SHALL preserve any in-progress input without submitting it.

### Requirement 18: Restrict Access to Single User

**User Story:** As the Owner, I want my recipe collection protected from access by others, so that my personal data and notes stay private.

#### Acceptance Criteria

1. THE Recipe_Site SHALL require the Owner to authenticate before viewing or modifying any Recipe_Record, regardless of the access path used (including direct URL navigation, bookmarked links, or API requests).
2. IF an unauthenticated visitor attempts to access the Recipe_Site through any access path, THEN THE Recipe_Site SHALL deny access to Recipe_Records and SHALL present a sign-in prompt.
3. IF the Owner submits invalid credentials, THEN THE Recipe_Site SHALL deny access and SHALL present an error message indicating that the credentials are invalid, without granting access to any Recipe_Record.
4. WHEN the Owner signs out, THE Recipe_Site SHALL terminate the Owner's active session and SHALL require re-authentication before any subsequent access to Recipe_Records.
5. WHEN the Owner's session has been idle for 30 consecutive days, THE Recipe_Site SHALL automatically terminate the session and SHALL require re-authentication before further access to Recipe_Records. (Note: the 30-day idle timeout is a default assumption — confirm the desired duration with the Owner.)
