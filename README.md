# BCP Monthly Headcount Report

Static web app for employee month-end headcount reporting.

## Run Locally

Open `index.html` in a browser.

## Publish With GitHub Pages

1. Create a new GitHub repository.
2. Add these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `default-data.js`
   - `jszip.min.js`
   - `.nojekyll`
3. Commit and push the files.
4. In GitHub, go to `Settings` > `Pages`.
5. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Save. GitHub will provide the Pages URL once deployment finishes.

## Spreadsheet Input

The app includes the current employee extract as sample data in `default-data.js`.
Users can also upload `.xlsx`, `.csv`, `.tsv`, or `.txt` files, or paste rows directly into the app.

Expected headers include:

- `EmployeeID`
- `FirstNameShort`
- `LastName`
- `Start Date`
- `Leaving Date`
- `Birth date`

Similar headers such as `Employee ID`, `First Name`, `Surname`, `End Date`, `DOB`, and `Date of Birth` are also accepted.
