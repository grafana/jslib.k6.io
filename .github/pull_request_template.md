## Description

<!-- Describe the content of the Pull Request, if relevant -->

## Please fill in this template.

- [ ] Use a meaningful title for the Pull Request. Include the name of the jslib added/modified.
- [ ] Fill the description section of the Pull Request. 
- [ ] Test the change in your code, and ensure the `npm run test` command succeeds.
- [ ] Run `yarn run generate-homepage` locally and verify the new homepage `/lib/index.html` file looks legit.

**Select one of these and delete the others**:

*If adding a new jslib*:
- [ ] The Pull Request creates a `/lib/{jslib_name}` folder.
- [ ] The Pull Request creates a `/lib/{jslib_name}/{desired_version}` folder.
- [ ] The `/lib/{jslib_name}/{desired_version}/index.js` file containing the jslib's code bundle exists.
- [ ] The Pull Request updates the `supported.json` file to contain an entry for the newly added jslib and its `{desired_version}`, as in the following example:
```JSON
{
  "{jslib_name}": {
    // Available package versions
    "versions": [
      "{desired_version}"
    ],

    // (optional) Documentation's or repository's URL
    "docs-url": "{documentation_or_repository_url}",

    // (optional) As a default, the homepage will point to
    // a package's bundle's index.js. If your package's main
    // bundle name is different; set it here (see the AWS
    // package for instance).
    "bundle-filename": "{index.js}"
}
```
- [ ] Tests have been added to `/tests/basic.js` and `/tests/testSuite.js` to ensure that the added jslib is importable and runnable by k6.

*If publishing a new version of an existing jslib*:
- [ ] The Pull Request is labeled with the `version bump` label.
- [ ] The Pull Request adds a `/lib/{jslib_name}/{desired_version}` folder.
- [ ] The Pull Request adds a `/lib/{jslib_name}/{desired_version}/index.js` file containing the jslib's code bundle.
- [ ] The Pull Request updates the `supported.json` file to contain an entry for the newly added jslib version, as in the following example:
```JSON
{
  "my-lib": [
    "1.0.2",
    // Use semantic versioning
    "{desired_version}"
  ]
}
```
- [ ] The Pull Request adds the relevant tests to the `/tests/basic.js` and `/tests/testSuite.js` files to ensure that the new version of the jslib is importable and runnable by k6.
- Merge the Pull Request once it is green. PRs adding new jslib versions do not require to get a review to be merged :rocket:. 