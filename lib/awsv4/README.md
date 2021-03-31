# WIP

This tries to reimplement AWS v4 signing using k6 crypto library.

The header.js file should be used for anything apart S3.

This needs a lot of testing, the current way is to use localstack, which unfortunately turns out to
be checking something about the authentication, but apparently not the signature as it doesn't
matter what credential are used :(.
