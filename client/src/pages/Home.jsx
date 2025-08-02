import React, { useState } from 'react';
import Header from '../components/Header';
import HeroSection from '../components/homeComponents/HeroSection';
import FeaturesSection from '../components/homeComponents/FeaturesSection';
import FeaturedRestaurantsSection from '../components/homeComponents/FeaturedRestaurantsSection';
import Footer from '../components/Footer';
import { Wallet, ShoppingCart, UtensilsCrossed, MessageSquare, Users, MapPin } from 'lucide-react';
import FAQSection from '../components/homeComponents/FAQSection';

function Home() {

  

  const featuredRestaurants = [
    { name: "The Gourmet Kitchen", cuisine: "Italian, Continental", rating: 4.8, image: "https://placehold.co/600x400/34d399/ffffff?text=Gourmet+Kitchen" },
    { name: "Spice Route", cuisine: "Indian, Asian Fusion", rating: 4.6, image: "https://placehold.co/600x400/f59e0b/ffffff?text=Spice+Route" },
    { name: "Burger Bliss", cuisine: "American, Fast Food", rating: 4.5, image: "https://placehold.co/600x400/ef4444/ffffff?text=Burger+Bliss" },
    { name: "Sushi Central", cuisine: "Japanese, Sushi", rating: 4.9, image: "https://placehold.co/600x400/6366f1/ffffff?text=Sushi+Central" },
  ];

  const features = [
    { icon: <Wallet className="w-10 h-10 text-emerald-500" />, title: "Integrated E-Wallet", description: "Load, pay, and manage your food court expenses with a secure and seamless digital wallet." },
    { icon: <ShoppingCart className="w-10 h-10 text-emerald-500" />, title: "Effortless Food Ordering", description: "Browse menus from all stores and place your order from a single, unified platform." },
    { icon: <UtensilsCrossed className="w-10 h-10 text-emerald-500" />, title: "Restaurant Reservations", description: "Planning a sit-down meal? Book your table in advance at any participating restaurant." },
    { icon: <Users className="w-10 h-10 text-emerald-500" />, title: "Unified User Management", description: "One account for everything. Manage your profile as a customer or a store owner." },
    { icon: <MessageSquare className="w-10 h-10 text-emerald-500" />, title: "AI-Powered Assistant", description: "Get instant help, recommendations, and answers to your questions from our smart chatbot." },
    { icon: <MapPin className="w-10 h-10 text-emerald-500" />, title: "Discover & Explore", description: "Find new stores, check out daily specials, and navigate the food court with ease." },
  ];

  return (
    <div className="bg-white dark:bg-gray-950 font-sans transition-colors duration-500">
      <main>
        <HeroSection />
        <FeaturesSection features={features} />
        <FeaturedRestaurantsSection restaurants={featuredRestaurants} />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}

export default Home;
