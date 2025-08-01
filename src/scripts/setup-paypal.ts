#!/usr/bin/env node

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface PayPalProduct {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
}

interface PayPalPlan {
  id: string;
  product_id: string;
  name: string;
  status: string;
}

class PayPalSetup {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
    this.baseUrl = process.env.PAYPAL_MODE === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('PayPal credentials not found in environment variables');
    }
  }

  async getAccessToken(): Promise<string> {
    console.log('🔐 Authenticating with PayPal...');
    
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Failed to authenticate: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  async paypalRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      await this.getAccessToken();
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers
      }
    });

    const text = await response.text();
    
    if (!response.ok) {
      console.error('PayPal API Error:', text);
      throw new Error(`PayPal API error: ${response.statusText}`);
    }

    return text ? JSON.parse(text) : null;
  }

  async createProduct(): Promise<PayPalProduct> {
    console.log('📦 Creating Voice Matrix Pro product...');
    
    const product = await this.paypalRequest('/v1/catalogs/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Voice Matrix Pro',
        description: 'AI Voice Assistant Platform - Pro Subscription',
        type: 'SERVICE',
        category: 'SOFTWARE',
        image_url: 'https://voicematrix.ai/logo.png',
        home_url: 'https://voicematrix.ai'
      })
    });

    console.log(`✅ Product created: ${product.id}`);
    return product;
  }

  async createPlan(productId: string): Promise<PayPalPlan> {
    console.log('📋 Creating Pro monthly plan...');
    
    const plan = await this.paypalRequest('/v1/billing/plans', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        name: 'Voice Matrix Pro - Monthly',
        description: '10 AI Assistants, 100 minutes/month, Priority Support',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // 0 means infinite
            pricing_scheme: {
              fixed_price: {
                value: '25',
                currency_code: 'USD'
              }
            }
          }
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: '0',
            currency_code: 'USD'
          },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3
        },
        taxes: {
          percentage: '0',
          inclusive: false
        }
      })
    });

    console.log(`✅ Plan created: ${plan.id}`);
    return plan;
  }

  async listProducts(): Promise<PayPalProduct[]> {
    console.log('📋 Listing existing products...');
    
    const response = await this.paypalRequest('/v1/catalogs/products?page_size=20&page=1&total_required=true');
    return response.products || [];
  }

  async listPlans(): Promise<PayPalPlan[]> {
    console.log('📋 Listing existing plans...');
    
    const response = await this.paypalRequest('/v1/billing/plans?page_size=20&page=1&total_required=true');
    return response.plans || [];
  }

  async setup() {
    try {
      console.log('🚀 Starting PayPal setup...');
      console.log(`Environment: ${process.env.PAYPAL_MODE || 'sandbox'}`);
      console.log('');

      // Check for existing products
      const existingProducts = await this.listProducts();
      const voiceMatrixProduct = existingProducts.find(p => p.name === 'Voice Matrix Pro');

      let productId: string;
      
      if (voiceMatrixProduct) {
        console.log(`✅ Found existing product: ${voiceMatrixProduct.id}`);
        productId = voiceMatrixProduct.id;
      } else {
        const newProduct = await this.createProduct();
        productId = newProduct.id;
      }

      // Check for existing plans
      const existingPlans = await this.listPlans();
      const proMonthlyPlan = existingPlans.find(p => 
        p.name === 'Voice Matrix Pro - Monthly' && p.status === 'ACTIVE'
      );

      if (proMonthlyPlan) {
        console.log(`✅ Found existing plan: ${proMonthlyPlan.id}`);
        console.log('');
        console.log('🎉 PayPal setup complete!');
        console.log('');
        console.log('Add this to your .env.local:');
        console.log(`PAYPAL_PRO_PLAN_ID=${proMonthlyPlan.id}`);
      } else {
        const newPlan = await this.createPlan(productId);
        console.log('');
        console.log('🎉 PayPal setup complete!');
        console.log('');
        console.log('Add this to your .env.local:');
        console.log(`PAYPAL_PRO_PLAN_ID=${newPlan.id}`);
      }

      console.log('');
      console.log('Next steps:');
      console.log('1. Add the plan ID to your .env.local file');
      console.log('2. Configure webhooks at https://developer.paypal.com/dashboard/webhooks');
      console.log('3. Test with sandbox accounts before going live');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }
}

// Run setup
const setup = new PayPalSetup();
setup.setup().catch(console.error);