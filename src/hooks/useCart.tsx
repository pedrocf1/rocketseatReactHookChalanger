import { AxiosError, AxiosResponse } from 'axios';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}
const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productFound = cart.find(
        product => product.id === productId
      );
      
      if (!productFound) {
        const newProduct: Product = await api.get(`products/${productId}`)
          .then((response: AxiosResponse) => {
            return response.data;
          })
          .catch((reason: AxiosError) => {
            if (reason.response!.status === 404) {
              throw new Error('Erro na adição do produto');
            }
          });

        if (!newProduct) {
          throw new Error('Erro na adição do produto');
        }

        newProduct.amount = 1;

        let newProducts = [...cart];
        newProducts.push(newProduct);

        setCart(newProducts);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newProducts));
      } else {
        const quantityProducts: Stock = await api.get(`stock/${productFound.id}`)
          .then((response: AxiosResponse) => {
            return response.data;
          })
          .catch((reason: AxiosError) => {
            if (reason.response!.status === 404) {
              throw new Error('Erro na adição do produto');
            }
          });

        if (!quantityProducts) {
          throw new Error('Erro na adição do produto');
        }

        productFound.amount += 1;

        if(productFound.amount <= quantityProducts.amount) {
          setCart(cart => [...cart]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
        } else {
          productFound.amount -= 1;
          throw new Error('Quantidade solicitada fora de estoque');
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productFound = cart.find(
        product => product.id === productId
      );

      if (!productFound) {
        throw new Error('Erro na remoção do produto');
      }

      const products = cart.filter(product => product.id !== productId);
      setCart([...products]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const quantityProducts: Stock = await api.get(`stock/${productId}`)
        .then((response: AxiosResponse) => {
          return response.data;
        })
        .catch((reason: AxiosError) => {
          if (reason.response!.status === 404) {
            throw new Error('Erro na alteração de quantidade do produto');
          }
        });

      if (!quantityProducts) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const productFound = cart.find(
        product => product.id === productId
      );

      if (!productFound) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      if (amount < 1) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      if(amount > quantityProducts.amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      productFound.amount = amount;
      setCart(cart => [...cart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}