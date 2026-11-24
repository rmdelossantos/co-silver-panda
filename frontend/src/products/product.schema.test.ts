import { describe, expect, it } from 'vitest';
import { productFormSchema } from './product.schema';

const valid = { name: 'Lamp', price: '19.99', category: 'Home', description: '' };

const firstError = (values: object) => {
  const result = productFormSchema.safeParse({ ...valid, ...values });
  return result.success ? undefined : result.error.issues[0]?.message;
};

describe('productFormSchema', () => {
  it('parses valid input into a ProductInput with a numeric price', () => {
    expect(productFormSchema.parse({ ...valid, name: '  Lamp ', price: ' 19.99 ' })).toEqual({
      name: 'Lamp',
      price: 19.99,
      category: 'Home',
      description: '',
    });
  });

  it.each([
    [{ name: '  ' }, 'Name is required'],
    [{ name: 'x'.repeat(101) }, 'Name must be at most 100 characters'],
    [{ price: '' }, 'Price is required'],
    [{ price: 'abc' }, 'Price must be a number'],
    [{ price: '1e3' }, 'Price must be a number'],
    [{ price: '0' }, 'Price must be greater than 0'],
    [{ price: '-5' }, 'Price must be greater than 0'],
    [{ price: '1.999' }, 'Price can have at most 2 decimal places'],
    [{ price: '1000001' }, 'Price must be at most 1,000,000'],
    [{ category: '' }, 'Category is required'],
    [{ description: 'x'.repeat(501) }, 'Description must be at most 500 characters'],
  ])('rejects %o with "%s"', (values, message) => {
    expect(firstError(values)).toBe(message);
  });
});
