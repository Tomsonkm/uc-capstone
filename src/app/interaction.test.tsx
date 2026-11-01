import { render,screen,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect} from 'vitest';
import App from './App';
it('enters student project browsing and preserves a ranked selection',async()=>{
 const user=userEvent.setup();render(<App/>);
 await user.click(screen.getByRole('link',{name:'Student portal'}));
 await user.click(screen.getByRole('button',{name:'Use demonstration'}));
 await user.type(screen.getByLabelText('Username'), 'student');
 await user.type(screen.getByLabelText('Password',{exact:true}), 'Capstone2026!');
 await user.click(screen.getByRole('button',{name:'Sign in'}));
 await user.click(within(await screen.findByRole('navigation',{name:'Main navigation'})).getByRole('link',{name:'Explore projects'}));
 expect(screen.getByRole('heading',{name:'Find your next big idea.'})).toBeVisible();
 await user.click(screen.getAllByRole('button',{name:/Add to preferences/i})[0]);
 await user.click(screen.getByRole('link',{name:'My preferences'}));
 expect(screen.getByRole('heading',{name:'Make your case.'})).toBeVisible();
 expect(screen.getByText('1st preference')).toBeVisible();
});
it('shows a useful error for credentials from a different portal',async()=>{
 const user=userEvent.setup();render(<App/>);
 await user.click(screen.getByRole('link',{name:'Student portal'}));
 await user.click(screen.getByRole('button',{name:'Use demonstration'}));
 await user.type(screen.getByLabelText('Username'),'mentor');await user.type(screen.getByLabelText('Password',{exact:true}),'Capstone2026!');await user.click(screen.getByRole('button',{name:'Sign in'}));
 expect(screen.getByRole('alert')).toHaveTextContent(/username or password/i);expect(screen.queryByRole('navigation',{name:'Main navigation'})).not.toBeInTheDocument();
});
it('signs out and requires credentials to return to a dashboard',async()=>{
 const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('link',{name:'Staff portal'}));await user.click(screen.getByRole('link',{name:'Convener portal'}));
 await user.click(screen.getByRole('button',{name:'Use demonstration'}));
 await user.type(screen.getByLabelText('Username'),'convener');await user.type(screen.getByLabelText('Password',{exact:true}),'Capstone2026!');await user.click(screen.getByRole('button',{name:'Sign in'}));
 expect(await screen.findByText('Convener workspace')).toBeVisible();await user.click(screen.getByRole('button',{name:'Sign out'}));
 expect(screen.getByRole('heading',{name:'Convener sign in'})).toBeVisible();expect(sessionStorage.getItem('uc-demo-session')).toBeNull();expect(screen.queryByRole('navigation',{name:'Main navigation'})).not.toBeInTheDocument();
});

it('lets a visitor leave demonstration mode for real email sign-in',async()=>{
 window.history.replaceState({},'', '/login/student');sessionStorage.setItem('uc-demo-enabled','1');const user=userEvent.setup();render(<App/>);
 await user.click(screen.getByRole('button',{name:'Use real account sign-in'}));expect(sessionStorage.getItem('uc-demo-enabled')).toBeNull();expect(screen.queryByText('Fictional demonstration',{exact:true})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Use demonstration'})).toBeVisible();
});
it('offers simple signup and leaves fictional demonstration mode',async()=>{
 window.history.replaceState({},'', '/login/student');sessionStorage.setItem('uc-demo-enabled','1');const user=userEvent.setup();render(<App/>);
 await user.click(screen.getByRole('button',{name:'Sign up'}));
 expect(screen.getByRole('heading',{name:'Create your account'})).toBeVisible();expect(screen.getByRole('button',{name:'Create account'})).toBeVisible();
 expect(screen.queryByText('Fictional demonstration',{exact:true})).not.toBeInTheDocument();expect(sessionStorage.getItem('uc-demo-enabled')).toBeNull();
 expect(screen.getByText('Create an account, verify your email, then sign in.')).toBeVisible();
});
it('explains an expired link and leaves demo mode for real password recovery',async()=>{
 window.history.replaceState({},'', '/login/student?error=expired');sessionStorage.setItem('uc-demo-enabled','1');const user=userEvent.setup();render(<App/>);
 expect(screen.getByRole('alert')).toHaveTextContent(/expired|already used/i);await user.click(screen.getByRole('button',{name:'Forgot password?'}));
 expect(screen.getByRole('heading',{name:'Reset your password'})).toBeVisible();expect(screen.queryByText('Fictional demonstration',{exact:true})).not.toBeInTheDocument();expect(screen.getByText(/same browser and device/i)).toBeVisible();
});
it('requires matching new passwords before submitting a password reset',async()=>{
 window.history.replaceState({},'', '/reset-password');const user=userEvent.setup();render(<App/>);
 await user.type(screen.getByLabelText('New password',{exact:true}),'A-new-test-password');await user.type(screen.getByLabelText('Confirm new password'),'A-different-test-password');await user.click(screen.getByRole('button',{name:'Update password'}));
 expect(screen.getByRole('alert')).toHaveTextContent('The passwords do not match.');
});


