import React from "react";
import {createBrowserRouter} from 'react-router-dom';

import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";



import Borrow from "../view/borrow/BorrowIndex";
import Suply from "../view/suply/SuplyIndex";
import SuplyDetails from "../view/suply/SuplyDetails";
import Home from "../view/Home/HomeIndex";
import About from "../view/About/AboutIndex";
import TransactionList from "../view/Transaction/TransactionList";
import NotFount from "../view/403";
import NotificationSettings from "../view/Admin/Profile/NotificationSettings";
import ProfileBalance from "../view/Admin/Profile/ProfileBalance";
import ProfileInfo from "../view/Admin/Profile/ProfileInfo";
import SecuritySettings from "../view/Admin/Profile/SecuritySettings";
import NotConnected from "../view/403";
import PrivateRoute from "../components/PrivateRoute";



const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout/>,
        children:[
            {
                path: '/',
                element:<Home/>
            },
            {
                path: '/home',
                element:<Home/>
            },
            {
                path: '/suply',
                element: (
                    <PrivateRoute>
                        <Suply/>
                    </PrivateRoute>
                )
            },
            {
                path:'/suply/details',
                element: (
                    <PrivateRoute>
                        <SuplyDetails/>
                    </PrivateRoute>
                )
            },
            {
                path: '/borrow',
                element: (
                    <PrivateRoute>
                        <Borrow/>
                    </PrivateRoute>
                )
            },

            {
                path: '/about',
                element:<About/>
            },
            {
                path: '/transactionList',
                element: (
                    <PrivateRoute>
                        <TransactionList/>
                    </PrivateRoute>
                )
            },
            {
                path: '/notConnected',
                element:<NotConnected/>
            },
           
            {
                path: '/admin',
                element: (
                    <PrivateRoute>
                        <AdminLayout/>
                    </PrivateRoute>
                ),
                children:[
                    {
                        path: '/admin/profile/info',
                        element: (
                            <PrivateRoute>
                                <ProfileInfo />
                            </PrivateRoute>
                        )
                    },
                    {
                        path: '/admin/profile/balance',
                        element: (
                            <PrivateRoute>
                                <ProfileBalance />
                            </PrivateRoute>
                        )
                    },  
                    {
                        path: '/admin/profile/security',
                        element: (
                            <PrivateRoute>
                                <SecuritySettings/>
                            </PrivateRoute>
                        )
                    },
                   
                    {
                        path: '/admin/profile/history',
                        element: (
                            <PrivateRoute>
                                <TransactionList/>
                            </PrivateRoute>
                        )
                    },
                    {
                        path: '/admin/profile/notifications',
                        element: (
                            <PrivateRoute>
                                <NotificationSettings/>
                            </PrivateRoute>
                        )
                    },
                    
                ]
            },
            {
                path: '*',
                element:<NotFount/>
            },
        ]
    }
    
])

export default router
