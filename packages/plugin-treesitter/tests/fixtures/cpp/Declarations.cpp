#include <stddef.h>

#define DECLARE_API(name) int name()

namespace api {
class Widget {
public:
    void run(int value);
    void run(double value);
    Widget() = default;
};

int free(int value);
int free(double value);

#if FEATURE
int branch_symbol();
#else
int branch_symbol();
#endif
}

DECLARE_API(generated_cpp);
void api::Widget::run(int value) {}
