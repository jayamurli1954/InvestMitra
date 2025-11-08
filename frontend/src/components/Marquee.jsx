import React from 'react';

const Marquee = ({ items }) => {
  return (
    <div className="relative flex overflow-x-hidden bg-gray-900 text-white py-2">
      <div className="animate-marquee whitespace-nowrap">
        {items.map((item, index) => (
          <span key={index} className="mx-4">
            <span className="font-bold">{item.name}</span>
            <span className={`ml-2 ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.value.toFixed(2)}
            </span>
            <span className={`ml-2 ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.change_percent.toFixed(2)}%)
            </span>
          </span>
        ))}
      </div>

      <div className="absolute top-0 animate-marquee2 whitespace-nowrap">
        {items.map((item, index) => (
          <span key={index} className="mx-4">
            <span className="font-bold">{item.name}</span>
            <span className={`ml-2 ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.value.toFixed(2)}
            </span>
            <span className={`ml-2 ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.change_percent.toFixed(2)}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
