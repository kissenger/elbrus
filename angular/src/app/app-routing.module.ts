import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TsCallingPage } from 'src/app/shared/interfaces';

// Import components
import { RoutesCreateComponent } from './main/routes/routes-create/routes-create.component';
import { RoutesListComponent } from './main/routes/routes-list/routes-list.component';
import { RoutesReviewComponent } from './main/routes/routes-review/routes-review.component';
import { LoginComponent } from './landing/login/login.component';
import { ProfileComponent } from './main/profile/profile.component';
import { WelcomeComponent } from './landing/welcome/welcome.component';
import { AuthGuard } from './auth.guard';
import { LandingComponent } from './landing/landing.component';
import { MainComponent } from './main/main.component';

const appRoutes: Routes = [

  // Landing pages
  { path: '', redirectTo: 'landing/welcome', pathMatch: 'prefix'},
  { path: 'welcome', redirectTo: 'landing/welcome', pathMatch: 'prefix'},
  { path: 'login', redirectTo: 'landing/login', pathMatch: 'prefix'},
  { path: 'landing', component: LandingComponent,
    children: [
      { path: 'welcome', component: WelcomeComponent},
      { path: 'login',   component: LoginComponent}
    ]},

  // Main pages
  { path: '', component: MainComponent,
    children: [
      { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard]},
      { path: ':pathType/list', component: RoutesListComponent, canActivate: [AuthGuard]},
      // note the following route is redirected in AuthGuard
      { path: ':pathType/list/:pathId', component: RoutesListComponent, canActivate: [AuthGuard]},
      { path: ':pathType/create', component: RoutesCreateComponent, canActivate: [AuthGuard], data: <TsCallingPage>{callingPage: 'create'}},
      { path: ':pathType/edit', component: RoutesCreateComponent, canActivate: [AuthGuard], data: <TsCallingPage>{callingPage: 'edit'}},
      { path: ':pathType/review', component: RoutesReviewComponent, canActivate: [AuthGuard]},
    ]}

];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})

export class AppRoutingModule { }
