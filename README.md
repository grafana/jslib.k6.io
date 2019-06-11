# jslib.k6.io

Hosted "standard" JS libs for K6 scripts.


## Installing new package via npm and automagically adding it to libs
The outcome of this might vary depeding on the quality of the desired node_module you want to add.

The following command will try to:
1. Install the desired {package_name}
2. Copy the module to `/lib`
3. Update the homepage `/lib/index.html`

```bash
yarn run add-pkg {package_name}
```


## How to add a new lib
1. Create a new lib dir `/lib/{lib_name}`
3. Create a new version dir `/lib/{lib_name}/{desired_version}/`
4. Add entry file version `/lib/{lib_name}/{desired_version}/{desired_name}.js`
5. Add the lib to `supported.json` like:
```javascript
{
  "{lib_name}": {
    "{desired_version}": {}
  }
}

// Example result
{
  "awesome-lib": {
    "2.0.3": {}
  }
}
```
6. Update the homepage by running `yarn run update-homepage`.
7. Verify that new homepage `/lib/index.html` is legit.
8. Merge master.
9. Browse to https://jslib.k6.io/{lib_name}/{desired_version}/{desired_name}.js

## How to add a new version of a and existing lib
1. Create a new "version dir" in `/lib/{lib_name}/{desired_version}/`
2. Add entry file for version `/lib/{lib_name}/{desired_version}/{desired_name}.js`
3. Add the version to `supported.json` like:
```javascript
{
  "my-lib": {
    "1.0.2": {},
    // Use semantic versioning
    "{desired_version}": {}
  }
}

// Example result
{
  "my-lib": {
    "1.0.2": {},
    "2.0.3": {}
  }
}
```
4. Update the homepage by running `yarn run update-homepage`.
5. Verify that new homepage `/lib/index.html` is legit.
6. Merge master.
7. Browse to https://jslib.k6.io/{lib_name}/{desired_version}/{desired_name}.js

