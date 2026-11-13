public class Circle {
    private int x = 40;
    private int y = 50;
    private int diameter = 40;
    private String color = "blue";
    private boolean visible;

    public void makeVisible() { visible = true; draw(); }
    public void makeInvisible() { visible = false; draw(); }
    public void moveHorizontal(int distance) { x += distance; draw(); }
    public void moveVertical(int distance) { y += distance; draw(); }
    public void moveRight() { moveHorizontal(20); }
    public void moveLeft() { moveHorizontal(-20); }
    public void moveUp() { moveVertical(-20); }
    public void moveDown() { moveVertical(20); }
    public void changeColor(String value) { color = value; draw(); }
    public void changeSize(int value) { diameter = value; draw(); }

    private void draw() {
        Canvas.update(this, new java.awt.geom.Ellipse2D.Double(x, y, diameter, diameter), color, visible);
    }
}
