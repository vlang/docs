# V Documentation Generator

![](./docs/images/screenshot.png)

It is a simple generator creates multi-page page documentation
from the original V [docs.md](https://github.com/vlang/v/blob/master/doc/docs.md)

If you need a convenient way to read the original V documentation,
just use this generator.

This is the initial version of the
[VOSCA documentation generator](https://github.com/vlang-association/docs),
which does not have its own documentation but can generate documentation from the V
[docs.md](https://github.com/vlang/v/blob/master/doc/docs.md)
file.

## Build the documentation

To build the documentation, run the following command:

```shell
v install
npm run generate
```

This will install all dependencies, and generate the documentation in the `output` directory.

To run documentation server, run the following command:

```bash
npm run serve
```

And then just open http://localhost:8081 in your browser.
