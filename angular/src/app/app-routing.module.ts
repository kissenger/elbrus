import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Import components
import { RoutesCreateComponent } from './main/routes/routes-create/routes-create.component';
import { RoutesListComponent } from './main/routes/routes-list/routes-list.component';
import { RoutesReviewComponent } from './main/routes/routes-review/routes-review.component';
// import { WelcomeComponent } from './welcome/welcome.component';
import { AuthGuard } from './auth.guard';

const appRoutes: Routes = [
  // { path: 'welcome', component: WelcomeComponent},
  { path: '', component: RoutesListComponent},
  { path: ':pathType/list', component: RoutesListComponent},
  { path: ':pathType/list/:pathId', component: RoutesListComponent},
  { path: ':pathType/create', component: RoutesCreateComponent, canActivate: [AuthGuard], data : {callingPage : 'create'}},
  { path: ':pathType/edit', component: RoutesCreateComponent, canActivate: [AuthGuard], data : {callingPage : 'edit'}},
  { path: ':pathType/review', component: RoutesReviewComponent, canActivate: [AuthGuard]},
  // { path: 'verification/:userId/:verificationString', component: WelcomeComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
