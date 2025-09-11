import v.debug

fn test(i int) {
    if i > 9 {
        debug.dump_callstack()
    }
}

fn do_something() {
    for i := 0; i <= 10; i++ {
        test(i)
    }
}

fn main() {
    do_something()
}
