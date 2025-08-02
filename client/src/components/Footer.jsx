import React from 'react';

const Footer = () => (
  <footer className="bg-gray-800 text-white">
    <div className="container mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-xl font-bold text-emerald-400 mb-4">FoodCourt</h3>
          <p className="text-gray-400">The most convenient way to enjoy your favorite food court meals.</p>
        </div>
        <div>
          <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-gray-400 hover:text-white">Home</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white">Restaurants</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white">About Us</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-lg mb-4">Support</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-gray-400 hover:text-white">Contact Us</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white">AI Assistant</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-lg mb-4">Legal</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-gray-400 hover:text-white">Terms of Service</a></li>
            <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-12 border-t border-gray-700 pt-8 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} FoodCourt Systems. All Rights Reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
