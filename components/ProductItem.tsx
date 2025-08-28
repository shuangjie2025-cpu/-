
import React from 'react';
import type { QuoteItem } from '../types';
import { Icon } from './Icon';

interface ProductItemProps {
  item: QuoteItem;
  onQuantityChange: (id: string, newQuantity: number) => void;
  onPriceChange: (id: string, newPrice: number | undefined) => void;
  onRemove: (id: string) => void;
}

export const ProductItem: React.FC<ProductItemProps> = ({ item, onQuantityChange, onPriceChange, onRemove }) => {
  const handleQuantityChange = (amount: number) => {
    const newQuantity = Math.max(1, item.quantity + amount);
    onQuantityChange(item.id, newQuantity);
  };
  
  const handlePriceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '') {
          onPriceChange(item.id, undefined); // Revert to original price
      } else {
          const newPrice = parseFloat(value);
          if (!isNaN(newPrice)) {
              onPriceChange(item.id, newPrice);
          }
      }
  };

  const isPriceOverridden = item.quotePrice !== undefined;

  return (
    <div className="flex items-center p-4 border-b last:border-b-0 hover:bg-gray-50">
      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-md object-contain" />
      <div className="flex-grow ml-4">
        <p className="font-semibold text-gray-800">{item.name}</p>
        <p className="text-sm text-gray-500">{item.model}</p>
        <p className="text-sm text-gray-500">{item.description}</p>
      </div>
      <div className="flex items-center space-x-4 w-64">
        <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">
                {isPriceOverridden ? '自定义报价' : '单价'}
                {isPriceOverridden && <span className="ml-2 text-gray-400">(原价: ¥{item.unitPrice.toFixed(2)})</span>}
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input 
                    type="number"
                    value={item.quotePrice ?? ''}
                    onChange={handlePriceInput}
                    placeholder={item.unitPrice.toString()}
                    className={`w-32 pl-7 p-2 border rounded-md focus:ring-2 focus:ring-[#009999] focus:border-transparent ${isPriceOverridden ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                />
            </div>
        </div>
      </div>
      <div className="flex items-center space-x-2 w-40">
        <button onClick={() => handleQuantityChange(-1)} className="p-2 rounded-full hover:bg-gray-200 text-gray-600">
          <Icon name="minus" className="w-4 h-4" />
        </button>
        <input
            type="text"
            readOnly
            value={item.quantity}
            className="w-12 text-center border-0 bg-transparent font-semibold text-lg"
        />
        <button onClick={() => handleQuantityChange(1)} className="p-2 rounded-full hover:bg-gray-200 text-gray-600">
          <Icon name="plus" className="w-4 h-4" />
        </button>
      </div>
       <button onClick={() => onRemove(item.id)} className="p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600">
          <Icon name="trash" className="w-5 h-5" />
        </button>
    </div>
  );
};