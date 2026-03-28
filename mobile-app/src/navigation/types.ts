import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type HomeStackParamList = {
  Home: undefined;
  Classifieds: undefined;
  Services: undefined;
  Stores: undefined;
  ProductsBrowse: undefined;
  Directory: undefined;
  DirectoryDetail: { id: number };
  ListingDetail: { id: number };
  MemberPublicProfile: { userId: number };
  StoreDetailPublic: { id: number };
  ProductDetail: { id: number };
  Cart: undefined;
  Profile: undefined;
  ProviderHub: undefined;
  CreateListing: { listingType?: 'classified' | 'service'; seed?: number };
  CreateStore: { seed?: number };
  CreateDirectoryEntry: { seed?: number };
};

export type InboxStackParamList = {
  Inbox: undefined;
  Chat: { conversationId: number; peerName?: string; peerUserId?: number; peerUsername?: string };
};

export type OfficeStackParamList = {
  MyOffice: undefined;
  EditListing: { listingId: number };
  StoreManage: { storeId: number };
  EditStore: { storeId: number };
  EditProduct: { storeId: number; productId?: number };
  EditDirectoryEntry: { entryId: number };
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  InboxTab: NavigatorScreenParams<InboxStackParamList>;
  OfficeTab: NavigatorScreenParams<OfficeStackParamList>;
};

/** Single drawer screen wrapping the tab shell */
export type MainDrawerParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  ForgotPasswordEmail: undefined;
  ForgotPasswordOtp: { email: string };
  RecoverPassword: { email: string; resetToken: string };
  Register: undefined;
  RegisterOtp: { email: string };
  Questionnaire: undefined;
  PrivacyPolicy: undefined;
  Dashboard: undefined;
  SupportChat: { conversationId?: number };
  HireComingSoon: { username?: string };
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
