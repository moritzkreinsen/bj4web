# Shapes classroom fixture

This independently written test project follows the object creation and manipulation exercises in [Ulrich Helmich's BlueJ workshop](https://www.u-helmich.de/inf/kursEF/Folge01/Unterseiten/workshop-1.html). The accompanying [Objects First chapter 1 solutions](https://www.bluej.org/objects-first/second-edition/restricted/solutions/solutions1.pdf) describe the shape state and movement exercises. The example source and drawings here were written for BJ4Web.

From this directory run `zip -r Shapes.zip Shapes`. Choose the ZIP on the BJ4Web start screen. The archive opens in a fresh workspace. Right-click Circle and compile, then select new Circle(). Accept circle1 and create two more objects named sonne and mond. Select sonne and invoke makeVisible(), moveHorizontal(70), and changeColor("yellow"). Each object maintains its own position, size, color and visibility. Visible shapes share one drawing surface. Try a square and a triangle on the same canvas.

The fixture uses a lightweight Swing internal frame with a custom-painted panel. BJ4Web takes a component snapshot after each invocation and displays it on an HTML canvas. An unmodified desktop project that opens a native JFrame still requires additional toolkit support. Only Java sources are imported. The package.bluej file identifies the archive root; its desktop diagram coordinates are not restored.
