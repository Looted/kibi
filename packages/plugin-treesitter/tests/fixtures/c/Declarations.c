#include <stddef.h>
#define DECLARE_API(name) int name(void)

typedef struct Widget { int id; } Widget;
enum Mode { MODE_FAST };

int repeated(int value);
int repeated(int value) { return value; }
int pointer_func(const char *value) { return value != 0; }
int (*callback)(int);

#if FEATURE
int branch_symbol(void);
#else
int branch_symbol(void);
#endif

DECLARE_API(generated_api);
