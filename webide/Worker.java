import bluej.runtime.BJMap;
import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/** Local development worker. Each process owns exactly one object bench. */
public class Worker {
    private final SwingBridge gui = new SwingBridge();
    private final BJMap<String,Object> bench = new BJMap<>();
    private final Map<String,Executable> members = new LinkedHashMap<>();
    private final Set<String> names = new LinkedHashSet<>();

    private String describe(Class<?> type, boolean instance) {
        List<Executable> available = new ArrayList<>();
        if (!instance) available.addAll(Arrays.asList(type.getConstructors()));
        for (Method method : type.getMethods())
            if (method.getDeclaringClass() != Object.class && Modifier.isStatic(method.getModifiers()) != instance)
                available.add(method);
        for (Executable member : available) members.put(member.toGenericString(), member);
        return available.stream().map(Executable::toGenericString).sorted().collect(Collectors.joining("\n"));
    }

    private Class<?> load(String name) throws ClassNotFoundException {
        return Class.forName(name, false, getClass().getClassLoader());
    }

    private Object argument(String text, Class<?> type) {
        if (text.startsWith("@")) return type.cast(Objects.requireNonNull(bench.get(text.substring(1))));
        if (text.equals("null") && !type.isPrimitive()) return null;
        if (type == String.class) return text.startsWith("\"") && text.endsWith("\"") && text.length() >= 2
            ? text.substring(1,text.length()-1) : text;
        if (type == char.class && text.length() == 1) return text.charAt(0);
        if (type == boolean.class && Set.of("true","false").contains(text)) return Boolean.valueOf(text);
        if (type == byte.class) return Byte.valueOf(text);
        if (type == short.class) return Short.valueOf(text);
        if (type == int.class) return Integer.valueOf(text);
        if (type == long.class) return Long.valueOf(text);
        if (type == float.class) return Float.valueOf(text);
        if (type == double.class) return Double.valueOf(text);
        throw new IllegalArgumentException(type.getTypeName());
    }

    private String run(String[] p) throws Exception {
        switch (p[0]) {
            case "class": return describe(load(p[1]), false);
            case "relations": {
                Class<?> type = load(p[1]);
                Set<String> edges = new LinkedHashSet<>();
                if (type.getSuperclass() != null && type.getSuperclass() != Object.class)
                    edges.add("△ " + type.getSuperclass().getTypeName());
                for (Class<?> iface : type.getInterfaces()) edges.add("△ " + iface.getTypeName());
                for (Field field : type.getDeclaredFields())
                    if (!field.getType().isPrimitive()) edges.add("→ " + field.getType().getTypeName());
                String kind = type.isInterface() ? "interface" : Modifier.isAbstract(type.getModifiers()) ? "abstract class" : "class";
                return kind + "\n" + String.join("\n", edges);
            }
            case "gui": return gui.render(bench.get(p[1]));
            case "click": return gui.click(p[1]);
            case "close": return gui.close(bench.get(p[1]));
            case "bench": return names.stream().map(n -> n + "\t" + bench.get(n).getClass().getSimpleName()).collect(Collectors.joining("\n"));
            case "objects": return String.join("\n", names);
            case "methods": return describe(Objects.requireNonNull(bench.get(p[1])).getClass(), true);
            case "remove": bench.remove(p[1]); names.remove(p[1]); return "";
            case "fields": {
                Object value = Objects.requireNonNull(bench.get(p[1]));
                StringJoiner fields = new StringJoiner("\n");
                for (Class<?> c = value.getClass(); c != null; c = c.getSuperclass())
                    for (Field f : c.getDeclaredFields())
                        if (!Modifier.isStatic(f.getModifiers()) && f.trySetAccessible())
                            fields.add(f.getName() + " = " + Objects.toString(f.get(value)));
                return fields.toString();
            }
            case "invoke": {
                Executable member = Objects.requireNonNull(members.get(p[1]));
                String name = p[3];
                if (!name.isEmpty() && (!name.matches("[a-zA-Z_$][a-zA-Z0-9_$]*") || names.contains(name)))
                    throw new IllegalArgumentException(name);
                Object[] args = new Object[member.getParameterCount()];
                if (p.length != args.length + 4) throw new IllegalArgumentException(member.toString());
                for (int i=0; i<args.length; i++) args[i] = argument(p[i+4],member.getParameterTypes()[i]);
                Object result = member instanceof Constructor<?> ctor ? ctor.newInstance(args)
                    : ((Method)member).invoke(bench.get(p[2]), args);
                if (result != null && !name.isEmpty()) { bench.put(name,result); names.add(name); }
                return Objects.toString(result);
            }
            default: throw new IllegalArgumentException();
        }
    }

    public static void main(String[] args) throws Exception {
        Worker worker = new Worker();
        PrintStream reply = System.out;
        BufferedReader requests = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        System.setIn(InputStream.nullInputStream());
        for (String line; (line = requests.readLine()) != null;) {
            ByteArrayOutputStream capture = new ByteArrayOutputStream();
            PrintStream console = new PrintStream(capture, true, StandardCharsets.UTF_8);
            System.setOut(console);
            System.setErr(console);
            String status = "ok", value;
            try {
                String[] parts = line.split("\t",-1);
                for (int i=0; i<parts.length; i++)
                    parts[i] = new String(Base64.getDecoder().decode(parts[i]), StandardCharsets.UTF_8);
                value = worker.run(parts);
            } catch (Throwable error) {
                status = "error";
                Throwable cause = error.getCause() == null ? error : error.getCause();
                cause.printStackTrace(console);
                value = cause.toString();
            }
            reply.println(status + "\t" + Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8))
                + "\t" + Base64.getEncoder().encodeToString(capture.toByteArray()));
            reply.flush();
        }
    }
}
