# V Documentation Generator

![](./docs/images/screenshot.png)

A simple generator to create multi-page documentation from the
original V [docs.md](https://github.com/vlang/v/blob/master/doc/docs.md)

## External dependencies

You'll need V, of course.  Best to
[install it from source](https://github.com/vlang/v?tab=readme-ov-file#installing-v-from-source)
if you don't already have it.

Make sure you have [sass](https://sass-lang.com/install/) installed
locally to build the css files.

## Build the documentation

To build the documentation, run the following command:

```shell
v install
v run .
sass --style compressed templates/assets/styles/style.scss:templates/assets/styles/style.css
```

This will install all dependencies, and generate the documentation in the `output` directory.

## Testing the output

Simple, with V
```shell
cd output
v -e 'import net.http.file; file.serve()'
```
Now load http://localhost:4001/ in your browser.
