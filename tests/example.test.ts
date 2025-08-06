describe('Example Test Suite', () => {
  test('should pass basic test', () => {
    expect(true).toBe(true);
  });

  test('should perform basic math', () => {
    expect(2 + 2).toBe(4);
  });

  test('should handle string operations', () => {
    const greeting = 'Hello World';
    expect(greeting).toContain('World');
    expect(greeting.length).toBe(11);
  });
});