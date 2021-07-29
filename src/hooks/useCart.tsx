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
    const storagedCart = localStorage.getItem('products')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const productToUpdateExists = newCart.find(product => product.id === productId);

      const stockResult = await api.get(`stock/${productId}`);

      const stock = stockResult.data;

      const amountToDecrement = productToUpdateExists ? productToUpdateExists.amount : 0;

      const amount = amountToDecrement - 1;

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productToUpdateExists) {
        productToUpdateExists.amount += amount;
      } else {
        const product = await api.get(`products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1,
        };
        newCart.push(newProduct);
      }

      updateStock(productId, amountToDecrement)
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto")
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const newCart = cart.filter((product)=> {
        if(product.id !== productId){
          return true
        }else{
          updateStock(product.id, product.amount)
          return false
        }
      })
      setCart(newCart)
      toast.success("Removido do carrinho com sucesso!")
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateStock = async(productId: number, amount:number)=>{
    const stockResult = await api.get(`stock/${productId}`)
    stockResult.data.amount += amount

    api.put(`stock/${productId}`, stockResult.data)
  }
  

  const updateProductAmount = async ({
    productId,
    amount ,
  }: UpdateProductAmount) => {
    try {
      const stockResult = await api.get(`stock/${productId}`)
      const stock:Stock = stockResult.data
      console.log(stock.amount, amount, stock.amount + amount)
      if(stock.amount + amount === 0 || amount === 0){
        return
      }

      if(amount > stock.amount){
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = [...cart]
      const productIndexToUpdateExists = newCart.findIndex((product, index) => product.id === productId );
      
      if(productIndexToUpdateExists){
        stock.amount += amount*-1;
        newCart[productIndexToUpdateExists].amount = amount;
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        api.put(`stock/${productId}`, stock)
      }else{
        throw Error()
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto")
    }
  };

  const canAlterCart = (product:Product, amount:number):boolean => {
    product.amount = product.amount ? product.amount : 0
    if((product.amount + amount) < 0){
      return false;
    }
    product.amount += amount
    if(product.amount < 0){
      return false;
    }

    return true
  }

  const isValidStockOperation = (product:Product, stock: Stock, amount:number):boolean => {

    if(stock.amount === 0){
      toast.error("Quantidade solicitada fora de estoque")
      return false;
    }
    stock.amount += amount*-1
    if(stock.amount < 0) {
      toast.error("Quantidade solicitada fora de estoque")
      return false;
    }
    if(!canAlterCart(product, amount)){
      toast.error("Não pode realizar essa operação!")
      return false;
    }
    return true
  }

  const addProductToCart = (product:Product)=>{
    const newCart = [...cart]
    const alreadyExistsIndex = cart.findIndex(prod=> prod.id === product.id)

    if(alreadyExistsIndex){
      newCart[alreadyExistsIndex] +=1
    }

    setCart(newCart)
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    toast.success("Carrinho atualizado com sucesso!")
  }


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
