# Simple Problems for Testing CERA

Use these exercises to test assignment creation, faculty test-case management, and student code execution. Create **one assignment per problem**. For each test case, add one case in the faculty **Test cases** page.

## How to enter a test case

In the faculty workspace:

1. Create an assignment using the title, course, description, due date, and points listed below.
2. Open the assignment and choose **Manage test cases**.
3. Choose **Add test case**.
4. Fill in **Input profile**, **Visibility**, **Weight**, **Standard input**, and **Expected standard output** from one case below. Save it, then repeat for each case.
5. Keep at least one case **Public**. Students can run their code against public cases; hidden cases are not shown to students.

Enter only the text shown inside each input/output code block. Do not include the ``` fences or labels such as `Input:`. Empty lines and spaces in input are significant. Output comparison ignores leading/trailing whitespace.

Unless your app requires a different course or due date, use:

- **Course:** `Programming Fundamentals`
- **Due date:** choose a future date in the assignment form
- **Languages:** enable the language(s) you want to test

---

## Problem 1: Add Two Integers

### Assignment form

- **Title:** Add Two Integers
- **Description:**

  Read two integers from standard input and print their sum.

- **Points:** `10`
- **Difficulty:** Beginner

### Student prompt

Read two integers separated by whitespace. Print their sum.

### Example

Input:

```text
8 5
```

Output:

```text
13
```

### Test cases to add

#### Case 1

- **Input profile:** Two positive integers
- **Visibility:** Public
- **Weight:** `1`
- **Standard input:**

```text
8 5
```

- **Expected standard output:**

```text
13
```

#### Case 2

- **Input profile:** Includes a negative integer
- **Visibility:** Public
- **Weight:** `1`
- **Standard input:**

```text
-4 9
```

- **Expected standard output:**

```text
5
```

#### Case 3

- **Input profile:** Two negative integers
- **Visibility:** Hidden
- **Weight:** `1`
- **Standard input:**

```text
-7 -3
```

- **Expected standard output:**

```text
-10
```

---

## Problem 2: Even or Odd

### Assignment form

- **Title:** Even or Odd
- **Description:**

  Read one integer. Print `Even` if it is divisible by 2; otherwise print `Odd`.

- **Points:** `10`
- **Difficulty:** Beginner

### Student prompt

Read one integer from standard input. Print exactly `Even` or `Odd` (capital first letter).

### Example

Input:

```text
12
```

Output:

```text
Even
```

### Test cases to add

#### Case 1

- **Input profile:** Positive even integer
- **Visibility:** Public
- **Weight:** `1`
- **Standard input:**

```text
12
```

- **Expected standard output:**

```text
Even
```

#### Case 2

- **Input profile:** Positive odd integer
- **Visibility:** Public
- **Weight:** `1`
- **Standard input:**

```text
7
```

- **Expected standard output:**

```text
Odd
```

#### Case 3

- **Input profile:** Zero
- **Visibility:** Hidden
- **Weight:** `1`
- **Standard input:**

```text
0
```

- **Expected standard output:**

```text
Even
```

---

## Problem 3: Largest of Three Integers

### Assignment form

- **Title:** Largest of Three Integers
- **Description:**

  Read three integers and print the largest value.

- **Points:** `10`
- **Difficulty:** Beginner

### Student prompt

Read three integers separated by whitespace. Print the largest integer. If values are tied for largest, print that value once.

### Example

Input:

```text
4 11 6
```

Output:

```text
11
```

### Test cases to add

#### Case 1

- **Input profile:** Largest value is in the middle
- **Visibility:** Public
- **Weight:** `1`
- **Standard input:**

```text
4 11 6
```

- **Expected standard output:**

```text
11
```

#### Case 2

- **Input profile:** Largest value is first
- **Visibility:** Public
- **Weight:** `1`
- **Standard input:**

```text
20 3 9
```

- **Expected standard output:**

```text
20
```

#### Case 3

- **Input profile:** All values are negative
- **Visibility:** Hidden
- **Weight:** `1`
- **Standard input:**

```text
-8 -2 -5
```

- **Expected standard output:**

```text
-2
```

---

## Suggested Python solutions for smoke testing

These are reference programs for quickly confirming that the test cases and runner are connected. Students should write their own solution.

### Add Two Integers

```python
a, b = map(int, input().split())
print(a + b)
```

### Even or Odd

```python
number = int(input())
print("Even" if number % 2 == 0 else "Odd")
```

### Largest of Three Integers

```python
a, b, c = map(int, input().split())
print(max(a, b, c))
```
