import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type HomeStackParamList = {
  Home: undefined;
  Classifieds: { initialQuery?: string } | undefined;
  Services: { initialQuery?: string } | undefined;
  Stores: undefined;
  ProductsBrowse: undefined;
  Directory: undefined;
  DirectoryDetail: { id: number };
  ListingDetail: { id: number };
  MemberPublicProfile: { userId: number; listingViaHomeTab?: boolean };
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
  MemberPublicProfile: { userId: number; listingViaHomeTab?: boolean };
};

export type OfficeStackParamList = {
  MyOffice: undefined;
  EditListing: { listingId: number };
  StoreManage: { storeId: number };
  EditStore: { storeId: number };
  EditProduct: { storeId: number; productId?: number };
  EditDirectoryEntry: { entryId: number };
};

/** Discover tab — browse entry points (detail screens live on Home stack). */
export type DiscoverStackParamList = {
  Discover: undefined;
};

/** Profile tab — settings only (detail flows use Home stack). */
export type ProfileStackParamList = {
  Profile: undefined;
};

export type PostTabStackParamList = {
  PostEmpty: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  DiscoverTab: NavigatorScreenParams<DiscoverStackParamList>;
  PostTab: NavigatorScreenParams<PostTabStackParamList>;
  InboxTab: NavigatorScreenParams<InboxStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
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
