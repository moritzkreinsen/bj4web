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

    private static String onEdt(Callable<String> action) throws Exception {
        FutureTask<String> task = new FutureTask<>(action);
        SwingUtilities.invokeAndWait(task);
        return task.get();
    }

    String render(Object root) throws Exception {
        return onEdt(() -> {
            buttons.clear();
            if (!(root instanceof JInternalFrame frame) || frame.isClosed()) return "";
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

    private void visit(Component component, List<String> rows) {
        if (!component.isVisible()) return;
        if (component instanceof JLabel label) rows.add(row("label", "", label.getText()));
        else if (component instanceof JButton button) {
            String id = Integer.toString(++nextId);
            buttons.put(id, button);
            rows.add(row("button", id, button.getText()));
        } else if (component instanceof Container parent)
            for (Component child : parent.getComponents()) visit(child, rows);
    }

    String click(String id) throws Exception {
        return onEdt(() -> { Objects.requireNonNull(buttons.get(id)).doClick(); return ""; });
    }

    String close(Object root) throws Exception {
        return onEdt(() -> { ((JInternalFrame)root).setClosed(true); buttons.clear(); return ""; });
    }
}
