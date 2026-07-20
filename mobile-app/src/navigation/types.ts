import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type HomeStackParamList = {
  Home: undefined;
  Classifieds: { initialQuery?: string } | undefined;
  Services: { initialQuery?: string } | undefined;
  Community: { initialQuery?: string } | undefined;
  Stores: undefined;
  ProductsBrowse: undefined;
  Directory: undefined;
  DirectoryDetail: { id: number };
  ListingDetail: { id: number };
  MemberPublicProfile: { userId: number; listingViaHomeTab?: boolean };
  StoreDetailPublic: { id: number };
  ProductDetail: { id: number };
  Cart:
    | {
        subjectType?: 'product' | 'listing' | 'directory_entry' | 'member';
        subjectId?: number;
      }
    | undefined;
  CartCheckout: undefined;
  Orders: undefined;
  OrderDetail: { id: number };
  Favorites: undefined;
  MembershipPlans: undefined;
  StorefrontAddon: undefined;
  Profile: undefined;
  EditAccount: undefined;
  ProviderHub: undefined;
  CreateListing: { listingType?: 'classified' | 'service' | 'community'; seed?: number };
  CreateStore: { seed?: number };
  CreateDirectoryEntry: { seed?: number };
};

export type InboxStackParamList = {
  Inbox: undefined;
  Chat: {
    conversationId: number;
    peerName?: string;
    peerUserId?: number;
    peerUsername?: string;
    /** false for marketplace / store / product threads; omit or true for services & directory */
    showHire?: boolean;
  };
  MemberPublicProfile: { userId: number; listingViaHomeTab?: boolean };
};

export type OfficeStackParamList = {
  MyOffice: undefined;
  EditListing: { listingId: number };
  StoreManage: { storeId: number };
  EditStore: { storeId: number };
  EditProduct: { storeId: number; productId?: number };
  EditDirectoryEntry: { entryId: number };
  SalesDashboard: undefined;
};

/** Discover tab — browse entry points (detail screens live on Home stack). */
export type DiscoverStackParamList = {
  Discover: undefined;
};

/** Profile tab — settings only (detail flows use Home stack). */
export type ProfileStackParamList = {
  Profile: undefined;
  EditAccount: undefined;
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

export type RootStackParamList = {
  Walkthrough: undefined;
  Welcome: undefined;
  Login: undefined;
  ForgotPasswordEmail: undefined;
  ForgotPasswordOtp: { email: string };
  RecoverPassword: { email: string; resetToken: string };
  Register: undefined;
  RegisterOtp: { email: string };
  /** In-app card capture (Stripe RN); no browser. */
  AddPaymentCard: { returnTo?: 'register_complete' | 'pop'; email?: string } | undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  /** Tab shell lives under Dashboard; use nested navigate for tab routes (e.g. OfficeTab, HomeTab). */
  Dashboard: NavigatorScreenParams<MainTabParamList> | undefined;
  SupportChat: { conversationId?: number };
  HireComingSoon: { username?: string; peerUserId?: number };
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
