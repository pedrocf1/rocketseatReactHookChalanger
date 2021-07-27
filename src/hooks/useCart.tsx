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

    return [{id: 1,
      image: "https://rocketseat-cdn.s3-sa-east-1.amazonaws.com/modulo-redux/tenis1.jpg",
      price: 179.9,
      title: "Tênis de Caminhada Leve Confortável"}];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAmountToUpdate:UpdateProductAmount={
        productId,
        amount:1
      }
      updateProductAmount(productAmountToUpdate)
    } catch {
      // TODO
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // TODO
    } catch {
      // TODO
    }
  };

  const updateProductAmount = async ({
    productId,
    amount ,
  }: UpdateProductAmount) => {
    try {
      
      api.get(`stock/${productId}`).then( async (result) =>{
        const stock:Stock = result.data

        const product = await (await api.get<Product>(`products/${productId}`)).data

        if(!isValidStockOperation(product, stock, amount)){
          return
        }        
        api.put(`stock/${productId}`, stock).then(result=>{
          addProductToCart(product)
          toast.success("Carrinho atualizado com sucesso!")
        }).catch(err=> console.log('err', err))

      }).catch(error=> toast.error("Erro ao atualizar o carrinho! Por favor tente mais tarde."))
      
    } catch {
      toast.error("Erro ao adicionar ao carrinho, por favor tente mais tarde.")
    }
  };

  const canAlterCart = (product:Product, amount:number):boolean => {
    if(product.amount === 0){
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
      toast.error("produto fora de estoque, por favor tente mais tarde")
      return false;
    }
    stock.amount += amount*-1
    if(stock.amount < 0) {
      toast.error("Não é possivel alterar a quantidade pedida, não temos estoque suficiente no momento")
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
    if(newCart.length){
    for (let i = 0; i < newCart.length; i++) {
      console.log(i, cart.length)
      if(cart[i].id === product.id){
        newCart[i] = product
        break;
      }else if(i === cart.length-1){
        newCart.push(product)
      }
    }
    }else{
      setCart([...cart, product])
    }
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
