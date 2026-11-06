"use client";
import {AdminNotificationProvider} from "@/features/admin-notifications/components/AdminNotificationProvider";
import {AdminHeader} from "@/features/admin/components/AdminHeader";
import {AdminSidebar} from "@/features/admin/components/AdminSidebar";
import {SupportInbox} from "@/features/ofistant-support/SupportInbox";
const user={id:"staff-1",name:"Staf Uji",role:"sales" as const,isMock:true};
export default function Demo(){return <AdminNotificationProvider role="sales" userId="staff-1"><div className="flex min-w-0 flex-col lg:flex-row"><AdminSidebar user={user}/><div style={{flex:"1 1 300px",minWidth:0}}><AdminHeader user={user}/><SupportInbox actorId="staff-1"/></div></div></AdminNotificationProvider>;}