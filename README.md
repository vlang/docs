# V Documentation Generator

![](./docs/images/screenshot.png)

It is a simple generator creates multi-page page documentation
from the original V [doc.md](https://github.com/vlang/v/blob/master/doc/docs.md)

If you need a convenient way to read the original V documentation,
just use this generator. Perhaps someone will publish the generated content
on their server, and I will leave a link here.

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
