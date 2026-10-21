import React from 'react';
import { render, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useNotificationResponse } from '../services/useNotificationResponse';
import { navigateToNotification } from '../utils/notificationNavigation';

let mockLoggedIn = false;
let mockPathname = '/';
let mockNavigation = {key:'root',index:0,routes:[{name:'index'}]};
let mockResponseListener;
jest.mock('react-redux',()=>({useSelector:(selector)=>selector({auth:{isLoggedIn:mockLoggedIn}})}));
jest.mock('expo-router',()=>({router:{push:jest.fn()},usePathname:()=>mockPathname,useRootNavigationState:()=>mockNavigation}));
jest.mock('expo-notifications',()=>({
 addNotificationResponseReceivedListener:jest.fn((listener)=>{mockResponseListener=listener;return {remove:jest.fn()}}),
 getLastNotificationResponseAsync:jest.fn(),clearLastNotificationResponseAsync:jest.fn(()=>Promise.resolve()),
}));
const response={actionIdentifier:'default',notification:{request:{identifier:'tap-1',content:{data:{eventKey:'DEAL_CREATED',route:'/deals/deal-1'}}}}};
function Harness({onOpen}){useNotificationResponse(onOpen);return null;}
beforeEach(()=>{jest.clearAllMocks();mockLoggedIn=false;mockPathname='/';mockNavigation={key:'root',index:0,routes:[{name:'index'}]};Notifications.getLastNotificationResponseAsync.mockResolvedValue(null)});

test('cold-start tap waits for restored login and index redirect, then opens once',async()=>{
 Notifications.getLastNotificationResponseAsync.mockResolvedValue(response);
 const onOpen=jest.fn();const view=await render(<Harness onOpen={onOpen}/>);
 expect(onOpen).not.toHaveBeenCalled();
 mockLoggedIn=true;await view.rerender(<Harness onOpen={onOpen}/>);expect(onOpen).not.toHaveBeenCalled();
 mockPathname='/home';mockNavigation={key:'root',index:1,routes:[{name:'index'},{name:'(tabs)'}]};
 await view.rerender(<Harness onOpen={onOpen}/>);
 expect(onOpen).toHaveBeenCalledTimes(1);
 await act(async()=>mockResponseListener(response));
 expect(onOpen).toHaveBeenCalledTimes(1);expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
});
test('notification stays pending during login and branch onboarding',async()=>{
 const onOpen=jest.fn();mockLoggedIn=true;mockPathname='/location-permission';mockNavigation={key:'root',index:0,routes:[{name:'(auth)'}]};
 const view=await render(<Harness onOpen={onOpen}/>);await act(async()=>mockResponseListener(response));expect(onOpen).not.toHaveBeenCalled();
 mockPathname='/home';mockNavigation={key:'root',index:0,routes:[{name:'(tabs)'}]};await view.rerender(<Harness onOpen={onOpen}/>);expect(onOpen).toHaveBeenCalledTimes(1);
});
test('backend route opens actual deal payments workspace',()=>{
 navigateToNotification({data:{route:'/deals/deal-1/payments',event:'MILESTONE_PAID'}});
 expect(router.push).toHaveBeenCalledWith({pathname:'/(tabs)/myDeals/[id]',params:{id:'deal-1',tab:'Payment Schedule'}});
});
test('booking route takes precedence over generic visit route',()=>{
 navigateToNotification({data:{route:'/visits/book/property-1'}});
 expect(router.push).toHaveBeenCalledWith({pathname:'/(screens)/book-site-visit',params:{propertyId:'property-1'}});
});
test('feedback opens review form instead of already-submitted screen',()=>{
 navigateToNotification({data:{route:'/visits/visit-1/feedback'}});
 expect(router.push).toHaveBeenCalledWith({pathname:'/(screens)/review',params:{visitId:'visit-1',tab:'Upcoming'}});
});

test('Expo Router synthetic __root stack still allows a pending tap to open',async()=>{
 const onOpen=jest.fn();mockLoggedIn=true;mockPathname='/home';
 mockNavigation={key:'root',index:0,routes:[{name:'__root',state:{index:0,routes:[{name:'(tabs)',state:{index:0,routes:[{name:'home'}]}}]}}]};
 await render(<Harness onOpen={onOpen}/>);await act(async()=>mockResponseListener(response));expect(onOpen).toHaveBeenCalledTimes(1);
});
