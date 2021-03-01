import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TsCallingPage } from 'src/app/shared/interfaces';

// Import components
import { RoutesCreateComponent } from './main/routes/routes-create/routes-create.component';
import { RoutesListComponent } from './main/routes/routes-list/routes-list.component';
import { RoutesReviewComponent } from './main/routes/routes-review/routes-review.component';
import { LoginComponent } from './landing-pages/login/login.component';
import { ProfileComponent } from './main/profile/profile.component';
import { MapSelectLocationComponent } from './main/map-select-location/map-select-location.component';
import { WelcomeComponent } from './landing-pages/welcome/welcome.component';
import { AuthGuard } from './auth.guard';
import { LandingComponent } from './landing-pages/landing/landing.component';

const appRoutes: Routes = [
  // { path: 'welcome', component: WelcomeComponent},
  // { path: '', redirectTo: 'welcome', pathMatch: 'prefix'},
  { path: '',
    component: LandingComponent,
    children: [
      { path: 'welcome', component: WelcomeComponent},
      { path: 'login',   component: LoginComponent}
    ]},
  // { path: 'welcome', component: WelcomeComponent, outlet: 'welcome'},
  { path: 'login', component: LoginComponent, outlet: 'welcome'},
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard]},
  { path: 'profile/select-home', component: MapSelectLocationComponent, canActivate: [AuthGuard]},
  { path: ':pathType/list', component: RoutesListComponent, canActivate: [AuthGuard]},
  // note the following route is redirected in AuthGuard
  { path: ':pathType/list/:pathId', component: RoutesListComponent, canActivate: [AuthGuard]},
  { path: ':pathType/create', component: RoutesCreateComponent, canActivate: [AuthGuard], data: <TsCallingPage>{callingPage: 'create'}},
  { path: ':pathType/edit', component: RoutesCreateComponent, canActivate: [AuthGuard], data: <TsCallingPage>{callingPage: 'edit'}},
  { path: ':pathType/review', component: RoutesReviewComponent, canActivate: [AuthGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})

export class AppRoutingModule { }
