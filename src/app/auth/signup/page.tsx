import { Metadata } from 'next';
import SignUpForm from '@/components/auth/signup-form';

export const metadata: Metadata = {
  title: 'Sign Up | Voice Matrix',
  description: 'Create your Voice Matrix account',
};

export default function SignUpPage() {
  return <SignUpForm />;
}