import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect} from 'vitest';
import App from './App';
it('offers student and staff entry, with all four staff roles',async()=>{const user=userEvent.setup();render(<App/>);expect(screen.getByRole('link',{name:'Student portal'})).toHaveAttribute('href','/login/student');await user.click(screen.getByRole('link',{name:'Staff portal'}));for(const name of ['Convener','Sponsor','Mentor','Tutor'])expect(screen.getByRole('link',{name:`${name} portal`})).toBeVisible();});
