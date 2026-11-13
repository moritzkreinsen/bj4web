import java.awt.Component;
import java.awt.Container;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.Callable;
import java.util.concurrent.FutureTask;
import javax.swing.*;

/** A component-level adapter for an explicitly returned lightweight Swing window. */
final class SwingBridge {
    private final Map<String, JButton> buttons = new HashMap<>();
    private int nextId;
    private JInternalFrame visibleWindow;

    private final Map<String,JInternalFrame> windows=new LinkedHashMap<>();
    private void track(JInternalFrame frame) {
        if (!windows.containsValue(frame)) windows.put(Integer.toString(windows.size()+1),frame);
    }

    String frames(Object returned) throws Exception {
        return onEdt(()->{
            if(returned instanceof JInternalFrame frame) track(frame);
            buttons.clear();
            List<String> rows=new ArrayList<>();
            for(var entry:windows.entrySet()){
                JInternalFrame frame=entry.getValue();
                rows.add(row(frame.isClosed()?"closed":"window",entry.getKey(),frame.getTitle()));
                if(!frame.isClosed()) visit(frame.getContentPane(),rows);
            }
            return String.join("\n",rows);
        });
    }

    String frameState(String id,boolean open) throws Exception {
        return onEdt(()->{
            JInternalFrame frame=Objects.requireNonNull(windows.get(id));
            frame.setClosed(!open);
            if(open) frame.setVisible(true);
            return "";
        });
    }

    SwingBridge() {
        java.awt.Toolkit.getDefaultToolkit().addAWTEventListener(event -> {
            if (event.getID() == java.awt.event.ComponentEvent.COMPONENT_SHOWN
                    && event.getSource() instanceof JInternalFrame frame) {visibleWindow = frame;track(frame);}
        }, java.awt.AWTEvent.COMPONENT_EVENT_MASK);
    }

    private JInternalFrame window(Object root) {
        return root instanceof JInternalFrame frame ? frame : visibleWindow;
    }

    private static String onEdt(Callable<String> action) throws Exception {
        FutureTask<String> task = new FutureTask<>(action);
        SwingUtilities.invokeAndWait(task);
        return task.get();
    }

    String render(Object root) throws Exception {
        return onEdt(() -> {
            buttons.clear();
            JInternalFrame frame = window(root);
            if (frame == null || frame.isClosed()) return "";
            List<String> rows = new ArrayList<>();
            rows.add(row("window", "", frame.getTitle()));
            visit(frame.getContentPane(), rows);
            return String.join("\n", rows);
        });
    }

    private static String row(String kind, String id, String text) {
        return kind + "\t" + id + "\t" + Base64.getEncoder().encodeToString(
            Objects.toString(text, "").getBytes(StandardCharsets.UTF_8));
    }

    private void visit(Component component, List<String> rows) throws java.io.IOException {
        if (!component.isVisible()) return;
        if (component instanceof JLabel label) rows.add(row("label", "", label.getText()));
        else if (component instanceof JButton button) {
            String id = Integer.toString(++nextId);
            buttons.put(id, button);
            rows.add(row("button", id, button.getText()));
        } else if (component instanceof JPanel panel && panel.getComponentCount() == 0
                && panel.getClass() != JPanel.class) {
            var size = panel.getSize();
            if (size.width == 0 || size.height == 0) size = panel.getPreferredSize();
            if (size.width <= 0 || size.height <= 0 || size.width > 1024 || size.height > 1024) return;
            panel.setSize(size);
            var image = new java.awt.image.BufferedImage(size.width, size.height, java.awt.image.BufferedImage.TYPE_INT_ARGB);
            var graphics = image.createGraphics();
            try { panel.printAll(graphics); } finally { graphics.dispose(); }
            var bytes = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(image, "png", bytes);
            if (bytes.size() <= 512 * 1024) rows.add("image\t\t" + Base64.getEncoder().encodeToString(bytes.toByteArray()));
        } else if (component instanceof Container parent)
            for (Component child : parent.getComponents()) visit(child, rows);
    }

    String click(String id) throws Exception {
        return onEdt(() -> { Objects.requireNonNull(buttons.get(id)).doClick(); return ""; });
    }

    String close(Object root) throws Exception {
        return onEdt(() -> { window(root).setClosed(true); buttons.clear(); return ""; });
    }
}
